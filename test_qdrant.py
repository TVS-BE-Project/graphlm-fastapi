from qdrant_client.http.models import Filter, FieldCondition, MatchValue

# Just to see if it instantiates properly
f = Filter(
    must=[
        FieldCondition(
            key="chat_id",
            match=MatchValue(value="123"),
        )
    ]
)
print("Filter type:", type(f))
