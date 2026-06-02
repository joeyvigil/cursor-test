import os
from typing import List

from fastapi import FastAPI, HTTPException
from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(description="Role of the message sender, for example: user")
    content: str = Field(description="Message content")


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    response: str


app = FastAPI(title="FastAPI + LangChain + Ollama Chatbot")


def _get_llm() -> ChatOllama:
    model_name = os.getenv("OLLAMA_MODEL", "llama3.1")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    return ChatOllama(model=model_name, base_url=base_url)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


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
