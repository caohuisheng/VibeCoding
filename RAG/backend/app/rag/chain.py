"""RAG 问答链（LCEL）：Prompt → LLM → 字符串输出。"""

from functools import lru_cache

from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

from ..config import settings

SYSTEM_PROMPT = """你是「电商知识库智能客服」，负责基于给定的商品知识库资料回答用户关于商品的问题。

请严格遵守以下规则：
1. 优先根据【参考资料】回答；资料中找不到答案时，如实告知"知识库中暂无相关信息"，不要猜测或编造。
2. 回答准确、简洁、口语化，聚焦用户问题，可适当分点。
3. 引用资料时，在对应句末标注来源编号，如 [1]、[2]，编号与参考资料顺序一致。
4. 商品参数、价格、库存等信息必须严格以资料为准，禁止凭空捏造。
"""


@lru_cache
def get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
        temperature=0.3,
        streaming=True,
    )


def build_chain():
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder("history"),
            ("human", "【参考资料】\n{context}\n\n【用户问题】\n{question}"),
        ]
    )
    return prompt | get_llm() | StrOutputParser()


def format_context(sources: list[Document]) -> str:
    """将检索到的分块拼接为带编号的参考资料。"""
    parts = []
    for i, s in enumerate(sources, 1):
        filename = s.metadata.get("filename", "未知来源")
        page = s.metadata.get("page", "")
        loc = f"第{page}页" if page else ""
        parts.append(f"[{i}] 来源《{filename}》{loc}：\n{s.page_content}")
    return "\n\n".join(parts)
