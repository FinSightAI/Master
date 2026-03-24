import json
import anthropic
from typing import AsyncIterator
from .tools import TOOL_DEFINITIONS
from .tools.implementations import execute_tool
from .prompts.system_prompt import SYSTEM_PROMPT


_client = None


def get_client():
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic()
    return _client


def build_profile_context(profile: dict) -> str:
    """Build a structured profile context string to inject into messages."""
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
        parts.append("⚠️ US PERSON STATUS: YES - Subject to worldwide US taxation and FATCA obligations")

    # Income
    income = profile.get("income", {})
    if any(income.values()):
        parts.append("\nAnnual Income (approximate USD):")
        if income.get("employment"):
            parts.append(f"  - Employment/Salary: ${income['employment']:,}")
        if income.get("business"):
            parts.append(f"  - Business income: ${income['business']:,}")
        if income.get("capital_gains"):
            parts.append(f"  - Capital gains: ${income['capital_gains']:,}")
        if income.get("dividends"):
            parts.append(f"  - Dividends: ${income['dividends']:,}")
        if income.get("crypto"):
            parts.append(f"  - Crypto gains: ${income['crypto']:,}")
        if income.get("rental"):
            parts.append(f"  - Rental income: ${income['rental']:,}")
        if income.get("other"):
            parts.append(f"  - Other: ${income['other']:,}")

    # Assets
    assets = profile.get("assets", {})
    if any(assets.values()):
        parts.append("\nMajor Assets:")
        if assets.get("stocks"):
            parts.append(f"  - Stocks/Securities: ${assets['stocks']:,}")
        if assets.get("real_estate"):
            parts.append(f"  - Real Estate: ${assets['real_estate']:,}")
        if assets.get("crypto_holdings"):
            parts.append(f"  - Crypto Holdings: ${assets['crypto_holdings']:,}")
        if assets.get("business_value"):
            parts.append(f"  - Business/Company Value: ${assets['business_value']:,}")
        if assets.get("other"):
            parts.append(f"  - Other Assets: ${assets['other']:,}")

    if profile.get("goals"):
        parts.append(f"\nPrimary Goals: {', '.join(profile['goals'])}")

    if profile.get("constraints"):
        parts.append(f"\nConstraints/Requirements: {', '.join(profile['constraints'])}")

    if profile.get("timeline"):
        parts.append(f"\nTimeline: {profile['timeline']}")

    if profile.get("notes"):
        parts.append(f"\nAdditional Context: {profile['notes']}")

    parts.append("</user_profile>")
    return "\n".join(parts)


async def run_agent(
    user_message: str,
    profile: dict,
    conversation_history: list
) -> AsyncIterator[dict]:
    """
    Run the tax advisor agent with streaming.
    Yields events:
    - {"type": "tool_start", "tool": name, "input": {...}}
    - {"type": "tool_result", "tool": name, "result": "..."}
    - {"type": "text_delta", "text": "..."}
    - {"type": "done"}
    - {"type": "error", "message": "..."}
    """
    try:
        profile_context = build_profile_context(profile)

        # Build the user message with profile context
        if profile_context:
            full_user_message = f"{profile_context}\n\n{user_message}"
        else:
            full_user_message = user_message

        # Build messages array
        messages = list(conversation_history)  # copy
        messages.append({"role": "user", "content": full_user_message})

        max_iterations = 10
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # Call Claude with streaming
            accumulated_text = ""
            accumulated_content = []
            stop_reason = None

            async with get_client().messages.stream(
                model="claude-opus-4-6",
                max_tokens=8096,
                thinking={"type": "adaptive"},
                system=SYSTEM_PROMPT,
                tools=TOOL_DEFINITIONS,
                messages=messages,
            ) as stream:
                current_block_type = None
                current_tool_use = None
                current_tool_input_json = ""

                async for event in stream:
                    event_type = event.type

                    if event_type == "content_block_start":
                        block = event.content_block
                        if block.type == "text":
                            current_block_type = "text"
                        elif block.type == "tool_use":
                            current_block_type = "tool_use"
                            current_tool_use = {
                                "id": block.id,
                                "name": block.name,
                                "input": {}
                            }
                            current_tool_input_json = ""
                        elif block.type == "thinking":
                            current_block_type = "thinking"

                    elif event_type == "content_block_delta":
                        delta = event.delta
                        if current_block_type == "text" and hasattr(delta, "text"):
                            accumulated_text += delta.text
                            yield {"type": "text_delta", "text": delta.text}
                        elif current_block_type == "tool_use" and hasattr(delta, "partial_json"):
                            current_tool_input_json += delta.partial_json

                    elif event_type == "content_block_stop":
                        if current_block_type == "tool_use" and current_tool_use:
                            try:
                                current_tool_use["input"] = json.loads(current_tool_input_json) if current_tool_input_json else {}
                            except:
                                current_tool_use["input"] = {}
                            accumulated_content.append({
                                "type": "tool_use",
                                **current_tool_use
                            })
                            current_tool_use = None
                            current_tool_input_json = ""
                        elif current_block_type == "text" and accumulated_text:
                            accumulated_content.append({
                                "type": "text",
                                "text": accumulated_text
                            })
                            accumulated_text = ""
                        current_block_type = None

                    elif event_type == "message_delta":
                        if hasattr(event, "delta") and hasattr(event.delta, "stop_reason"):
                            stop_reason = event.delta.stop_reason

            # Get the final message to extract all content
            final_message = await stream.get_final_message()
            stop_reason = final_message.stop_reason

            # Append assistant message to history
            messages.append({
                "role": "assistant",
                "content": final_message.content
            })

            # If no tool calls, we're done
            if stop_reason == "end_turn":
                break

            # Process tool calls
            if stop_reason == "tool_use":
                tool_results = []

                for block in final_message.content:
                    if block.type == "tool_use":
                        tool_name = block.name
                        tool_input = block.input

                        # Notify frontend
                        yield {
                            "type": "tool_start",
                            "tool": tool_name,
                            "input": tool_input
                        }

                        # Execute tool
                        try:
                            result = await execute_tool(tool_name, tool_input)
                        except Exception as e:
                            result = f"Tool error: {str(e)}"

                        yield {
                            "type": "tool_result",
                            "tool": tool_name,
                            "result_preview": result[:200] + "..." if len(result) > 200 else result
                        }

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result
                        })

                # Add tool results to messages
                messages.append({
                    "role": "user",
                    "content": tool_results
                })

        yield {"type": "done"}

    except anthropic.APIError as e:
        yield {"type": "error", "message": f"API Error: {str(e)}"}
    except Exception as e:
        yield {"type": "error", "message": f"Error: {str(e)}"}
