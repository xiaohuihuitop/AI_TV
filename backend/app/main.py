from fastapi import FastAPI

app = FastAPI(title="AI_TV Backend")


@app.get("/health")
def health():
    """!
    @brief AI:健康检查接口。
    @return AI:返回服务状态信息。
    """

    return {"status": "ok"}
