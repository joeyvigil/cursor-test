import os
from typing import Dict, List
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from langchain_core.messages import AIMessage, HumanMessage
from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(description="Role of the message sender, for example: user")
    content: str = Field(description="Message content")


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    response: str


class MemoryChatRequest(BaseModel):
    message: str = Field(description="The user's message")
    session_id: str | None = Field(
        default=None,
        description="Optional session ID to continue an existing conversation.",
    )


class MemoryChatResponse(BaseModel):
    session_id: str
    response: str


app = FastAPI(title="FastAPI + LangChain + Ollama Chatbot")

_conversations: Dict[str, List[ChatMessage]] = {}


def _get_llm() -> ChatOllama:
    model_name = os.getenv("OLLAMA_MODEL", "llama3.1")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    return ChatOllama(model=model_name, base_url=base_url)


def _to_langchain_messages(messages: List[ChatMessage]) -> List[HumanMessage | AIMessage]:
    lc_messages: List[HumanMessage | AIMessage] = []
    for msg in messages:
        if msg.role == "user":
            lc_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            lc_messages.append(AIMessage(content=msg.content))
    return lc_messages

@app.get("/")
def root():
    return {"message": "Hello, World!"}


@app.get("/health")
def health():
    return {"message": "OK"}


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    if not payload.messages:
        raise HTTPException(status_code=400, detail="At least one message is required.")

    llm = _get_llm()
    last_user_message = next(
        (msg.content for msg in reversed(payload.messages) if msg.role == "user"),
        None,
    )

    if not last_user_message:
        raise HTTPException(
            status_code=400, detail="At least one message with role='user' is required."
        )

    result = llm.invoke(last_user_message)
    return ChatResponse(response=result.content)


@app.post("/chat/memory", response_model=MemoryChatResponse)
def memory_chat(payload: MemoryChatRequest) -> MemoryChatResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if payload.session_id and payload.session_id not in _conversations:
        raise HTTPException(status_code=404, detail="Session not found.")

    session_id = payload.session_id or str(uuid4())
    history = _conversations.setdefault(session_id, [])
    history.append(ChatMessage(role="user", content=payload.message))

    llm = _get_llm()
    result = llm.invoke(_to_langchain_messages(history))
    history.append(ChatMessage(role="assistant", content=result.content))

    return MemoryChatResponse(session_id=session_id, response=result.content)
