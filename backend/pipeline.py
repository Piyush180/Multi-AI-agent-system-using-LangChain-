from agents import build_search_agent, build_reader_agent, writer_chain, critic_chain
from typing import AsyncGenerator
import asyncio


def _get_output(result: dict) -> str:
    """Extract final text output from create_agent's CompiledStateGraph result."""
    messages = result.get("messages", [])
    if messages:
        last = messages[-1]
        # LangChain message objects have .content attribute
        if hasattr(last, "content"):
            return last.content
        # dict format
        if isinstance(last, dict):
            return last.get("content", str(last))
    return str(result)


def run_research_pipeline(topic: str) -> dict:
    """
    Run the full 4-stage research pipeline synchronously.
    Returns a dict with all intermediate results and the final report.
    """
    state = {}

    # ── Stage 1: Search Agent ─────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("Stage 1 — Search Agent is working...")
    print("=" * 50)

    search_agent = build_search_agent()
    search_result = search_agent.invoke({
        "messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]
    })
    state["search_results"] = _get_output(search_result)
    print("\nSearch Results:\n", state["search_results"])

    # ── Stage 2: Reader Agent ─────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("Stage 2 — Reader Agent is scraping top resources...")
    print("=" * 50)

    reader_agent = build_reader_agent()
    reader_result = reader_agent.invoke({
        "messages": [(
            "user",
            f"Based on these search results about '{topic}', scrape the most relevant URLs "
            f"and summarize the key information:\n\n{state['search_results']}"
        )]
    })
    state["scraped_content"] = _get_output(reader_result)
    print("\nScraped Content:\n", state["scraped_content"])

    # ── Stage 3: Writer Chain ─────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("Stage 3 — Writer Chain composing research report...")
    print("=" * 50)

    draft = writer_chain.invoke({
        "topic": topic,
        "search_results": state["search_results"],
        "scraped_content": state["scraped_content"],
    })
    state["draft"] = draft
    print("\nDraft Report:\n", draft)

    # ── Stage 4: Critic Chain ─────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("Stage 4 — Critic Chain reviewing and improving report...")
    print("=" * 50)

    final = critic_chain.invoke({
        "topic": topic,
        "draft": draft,
    })
    state["final_report"] = final
    print("\nFinal Report:\n", final)

    return state


async def run_research_pipeline_streaming(topic: str) -> AsyncGenerator[dict, None]:
    """
    Async generator that yields stage-by-stage updates for SSE streaming.
    """
    state = {}

    # Stage 1
    yield {"stage": 1, "status": "running", "label": "Search Agent", "message": f"Searching for: {topic}"}
    await asyncio.sleep(0)

    try:
        search_agent = build_search_agent()
        search_result = await asyncio.to_thread(
            search_agent.invoke,
            {"messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]}
        )
        state["search_results"] = _get_output(search_result)
        yield {
            "stage": 1, "status": "done", "label": "Search Agent",
            "data": state["search_results"], "message": "Search complete",
        }
    except Exception as e:
        yield {"stage": 1, "status": "error", "label": "Search Agent", "message": str(e)}
        return

    # Stage 2
    yield {"stage": 2, "status": "running", "label": "Reader Agent", "message": "Scraping top resources..."}
    await asyncio.sleep(0)

    try:
        reader_agent = build_reader_agent()
        reader_result = await asyncio.to_thread(
            reader_agent.invoke,
            {"messages": [("user",
                f"Based on these search results about '{topic}', scrape the most relevant URLs "
                f"and summarize the key information:\n\n{state['search_results']}"
            )]}
        )
        state["scraped_content"] = _get_output(reader_result)
        yield {
            "stage": 2, "status": "done", "label": "Reader Agent",
            "data": state["scraped_content"], "message": "Scraping complete",
        }
    except Exception as e:
        yield {"stage": 2, "status": "error", "label": "Reader Agent", "message": str(e)}
        return

    # Stage 3
    yield {"stage": 3, "status": "running", "label": "Writer Chain", "message": "Writing research report..."}
    await asyncio.sleep(0)

    try:
        draft = await asyncio.to_thread(
            writer_chain.invoke,
            {
                "topic": topic,
                "search_results": state["search_results"],
                "scraped_content": state["scraped_content"],
            }
        )
        state["draft"] = draft
        yield {
            "stage": 3, "status": "done", "label": "Writer Chain",
            "data": draft, "message": "Draft report written",
        }
    except Exception as e:
        yield {"stage": 3, "status": "error", "label": "Writer Chain", "message": str(e)}
        return

    # Stage 4
    yield {"stage": 4, "status": "running", "label": "Critic Chain", "message": "Reviewing and improving report..."}
    await asyncio.sleep(0)

    try:
        final = await asyncio.to_thread(
            critic_chain.invoke,
            {"topic": topic, "draft": state["draft"]}
        )
        state["final_report"] = final
        yield {
            "stage": 4, "status": "done", "label": "Critic Chain",
            "data": final, "message": "Final report ready!",
        }
    except Exception as e:
        yield {"stage": 4, "status": "error", "label": "Critic Chain", "message": str(e)}
        return

    yield {"stage": 0, "status": "complete", "label": "Pipeline", "message": "Research complete!", "state": state}
