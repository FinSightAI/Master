import os
import asyncio
import anthropic
from typing import AsyncIterator
from .tools import TOOL_DEFINITIONS
from .tools.implementations import execute_tool
from .prompts.system_prompt import SYSTEM_PROMPT

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


def _build_claude_tools():
    """Tool definitions are already in Anthropic format."""
    return [
        {
            "name": t["name"],
            "description": t["description"],
            "input_schema": t["input_schema"],
        }
        for t in TOOL_DEFINITIONS
    ]


def _convert_history(history: list) -> list:
    """Convert conversation history to Anthropic messages format."""
    messages = []
    for msg in history:
        content = msg.get("content", "")
        if isinstance(content, str) and content.strip():
            messages.append({"role": msg["role"], "content": content})
    return messages


async def run_agent_claude(
    user_message: str,
    profile: dict,
    conversation_history: list,
    model: str = None,
) -> AsyncIterator[dict]:
    """
    Run the tax advisor agent with Claude (Anthropic API).
    Yields SSE-compatible dicts: text_delta, tool_start, tool_result, done, error.
    """
    if model is None:
        model = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5")

    try:
        from .orchestrator import build_profile_context
        profile_context = build_profile_context(profile)
        full_message = f"{profile_context}\n\n{user_message}" if profile_context else user_message

        client = _get_client()
        tools = _build_claude_tools()
        messages = _convert_history(conversation_history)
        messages.append({"role": "user", "content": full_message})

        for iteration in range(10):
            # Run sync call in thread to avoid blocking
            response = await asyncio.to_thread(
                client.messages.create,
                model=model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=tools,
                messages=messages,
            )

            # Collect tool use blocks
            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
            text_blocks = [b for b in response.content if b.type == "text"]

            if response.stop_reason == "end_turn" or not tool_use_blocks:
                # Final text response — simulate streaming in chunks
                text = "".join(b.text for b in text_blocks)
                chunk_size = 20
                for i in range(0, len(text), chunk_size):
                    yield {"type": "text_delta", "text": text[i:i + chunk_size]}
                    await asyncio.sleep(0.008)
                break

            # Append assistant message with tool_use blocks
            messages.append({"role": "assistant", "content": response.content})

            # Execute all tool calls
            tool_results = []
            for block in tool_use_blocks:
                yield {"type": "tool_start", "tool": block.name, "input": block.input}

                try:
                    result = await execute_tool(block.name, block.input)
                except Exception as e:
                    result = f"Tool error: {e}"

                yield {
                    "type": "tool_result",
                    "tool": block.name,
                    "result_preview": result[:200] + "..." if len(result) > 200 else result,
                }

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

            # Append tool results as user message
            messages.append({"role": "user", "content": tool_results})

        yield {"type": "done"}

    except Exception as e:
        yield {"type": "error", "message": f"Claude error: {str(e)}"}
