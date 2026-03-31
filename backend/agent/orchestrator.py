import json
import os
import asyncio
import google.generativeai as genai
from typing import AsyncIterator
from .tools import TOOL_DEFINITIONS
from .tools.implementations import execute_tool
from .prompts.system_prompt import SYSTEM_PROMPT

_model = None


def _get_model():
    global _model
    if _model is None:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
            tools=_build_gemini_tools(),
        )
    return _model


def _build_gemini_tools():
    """Convert Anthropic-format tool definitions to Gemini format."""
    declarations = []
    for tool in TOOL_DEFINITIONS:
        declarations.append({
            "name": tool["name"],
            "description": tool["description"][:500],  # Gemini has description limits
            "parameters": tool["input_schema"],
        })
    return [{"function_declarations": declarations}]


def build_profile_context(profile: dict) -> str:
    if not profile:
        return ""

    parts = ["<user_profile>"]

    if profile.get("citizenships"):
        parts.append(f"Citizenships: {', '.join(profile['citizenships'])}")
    if profile.get("current_residency"):
        parts.append(f"Current Tax Residency: {profile['current_residency']}")
    if profile.get("years_in_country"):
        parts.append(f"Years in current country: {profile['years_in_country']}")
    if profile.get("is_us_person"):
        parts.append("⚠️ US PERSON STATUS: YES - Subject to worldwide US taxation and FATCA")

    income = profile.get("income", {})
    if any(income.values()):
        parts.append("\nAnnual Income (USD):")
        for k, v in income.items():
            if v:
                parts.append(f"  - {k}: ${v:,}")

    assets = profile.get("assets", {})
    if any(assets.values()):
        parts.append("\nAssets (USD):")
        for k, v in assets.items():
            if v:
                parts.append(f"  - {k}: ${v:,}")

    if profile.get("goals"):
        parts.append(f"\nGoals: {', '.join(profile['goals'])}")
    if profile.get("constraints"):
        parts.append(f"\nConstraints: {', '.join(profile['constraints'])}")
    if profile.get("notes"):
        parts.append(f"\nContext: {profile['notes']}")

    parts.append("</user_profile>")
    return "\n".join(parts)


def _convert_history(history: list) -> list:
    """Convert Anthropic-style history to Gemini format (text-only turns)."""
    gemini_history = []
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        content = msg["content"]
        if isinstance(content, str) and content.strip():
            gemini_history.append({"role": role, "parts": [content]})
    return gemini_history


async def run_agent(
    user_message: str,
    profile: dict,
    conversation_history: list,
    provider: str = None,
) -> AsyncIterator[dict]:
    """
    Run the tax advisor agent. Routes to Claude or Gemini based on provider.
    Yields SSE-compatible dicts: text_delta, tool_start, tool_result, done, error.
    """
    # Determine provider: request > env var > default (gemini)
    if provider is None:
        provider = os.getenv("AI_PROVIDER", "gemini")

    if provider == "claude":
        from .orchestrator_claude import run_agent_claude
        async for event in run_agent_claude(user_message, profile, conversation_history):
            yield event
        return

    try:
        profile_context = build_profile_context(profile)
        full_message = f"{profile_context}\n\n{user_message}" if profile_context else user_message

        model = await asyncio.to_thread(_get_model)

        gemini_history = _convert_history(conversation_history)
        chat = await asyncio.to_thread(model.start_chat, history=gemini_history)

        # First call (non-streaming so we can detect tool calls)
        next_message = full_message
        is_first = True

        for iteration in range(10):
            # Send message (sync → wrapped in thread)
            response = await asyncio.to_thread(chat.send_message, next_message)

            # Collect parts
            parts = response.candidates[0].content.parts
            function_calls = [
                p for p in parts
                if hasattr(p, "function_call") and p.function_call.name
            ]

            if not function_calls:
                # Final text response — simulate streaming in 20-char chunks
                text = ""
                for part in parts:
                    if hasattr(part, "text") and part.text:
                        text += part.text

                chunk_size = 20
                for i in range(0, len(text), chunk_size):
                    yield {"type": "text_delta", "text": text[i:i + chunk_size]}
                    await asyncio.sleep(0.008)
                break

            # Execute all tool calls from this response
            tool_response_parts = []
            for fc_part in function_calls:
                tool_name = fc_part.function_call.name
                # Convert MapComposite → plain dict
                tool_input = {k: v for k, v in fc_part.function_call.args.items()}

                yield {"type": "tool_start", "tool": tool_name, "input": tool_input}

                try:
                    result = await execute_tool(tool_name, tool_input)
                except Exception as e:
                    result = f"Tool error: {e}"

                yield {
                    "type": "tool_result",
                    "tool": tool_name,
                    "result_preview": result[:200] + "..." if len(result) > 200 else result,
                }

                tool_response_parts.append(
                    genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=tool_name,
                            response={"result": result},
                        )
                    )
                )

            next_message = tool_response_parts

        yield {"type": "done"}

    except Exception as e:
        yield {"type": "error", "message": f"Error: {str(e)}"}
