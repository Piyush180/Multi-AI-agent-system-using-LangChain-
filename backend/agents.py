from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from tools import web_search, scrape_url
from dotenv import load_dotenv
import os

load_dotenv()

# ── Model Setup (Gemini) ──────────────────────────────────────────────────────
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
    google_api_key=os.getenv("GOOGLE_API_KEY"),
)


# ── 1st Agent: Search Agent ───────────────────────────────────────────────────
def build_search_agent():
    return create_agent(
        model=llm,
        tools=[web_search],
        system_prompt=(
            "You are an expert web researcher. Use the web_search tool to find "
            "recent, reliable, and detailed information about the given topic. "
            "Always search for the most up-to-date and comprehensive results. "
            "Return a structured summary of the top results with their sources."
        ),
    )


# ── 2nd Agent: Reader Agent ───────────────────────────────────────────────────
def build_reader_agent():
    return create_agent(
        model=llm,
        tools=[scrape_url],
        system_prompt=(
            "You are an expert content reader and summarizer. Use the scrape_url tool "
            "to read the full content of webpages. Extract the most important facts, "
            "key insights, data points, and quotes. Return a well-organized summary."
        ),
    )


# ── Writer Chain ──────────────────────────────────────────────────────────────
writer_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert research writer. Write clear, detailed, well-structured "
        "research reports. Use markdown formatting with headers, bullet points, and "
        "sections. Include key findings, analysis, and conclusions. Be comprehensive "
        "but concise. Cite sources where possible.",
    ),
    (
        "human",
        "Topic: {topic}\n\n"
        "Search Results:\n{search_results}\n\n"
        "Scraped Content:\n{scraped_content}\n\n"
        "Write a comprehensive research report on this topic using the information above.",
    ),
])

writer_chain = writer_prompt | llm | StrOutputParser()


# ── Critic Chain ─────────────────────────────────────────────────────────────
critic_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert research editor and fact-checker. Review research reports "
        "for accuracy, completeness, clarity, and structure. Identify any gaps, "
        "contradictions, or areas that need improvement. Then provide an improved, "
        "polished final version of the report.",
    ),
    (
        "human",
        "Topic: {topic}\n\n"
        "Draft Report:\n{draft}\n\n"
        "Please review this report, provide your critique, and then write an improved "
        "final version that addresses any issues. Format the response as:\n\n"
        "## Critique\n[Your critique here]\n\n"
        "## Improved Final Report\n[Improved report here]",
    ),
])

critic_chain = critic_prompt | llm | StrOutputParser()
