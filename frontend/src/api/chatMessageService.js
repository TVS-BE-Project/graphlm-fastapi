import axiosInstance from "./axios";
import ENV from "@/config/env";

const API_URL = ENV.API_URL;

const chatMessageService = {
  // Get messages for a session (paginated)
  getMessages: async (sessionId, params) => {
    const response = await axiosInstance.get(`/sessions/${sessionId}/messages`, { params });
    return response.data;
  },

  // Send a message and handle the SSE stream response
  sendMessageStream: async (sessionId, messageData, onChunk, onError, onComplete) => {
    try {
      const response = await fetch(`${API_URL}sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify(messageData),
        credentials: "include" // Important: sends cookies for auth
      });

      if (!response.ok) {
        // Attempt to parse JSON error message if possible
        let errorMsg = `Server error: ${response.status}`;
        try {
          const errorJson = await response.json();
          if (errorJson.message) errorMsg = errorJson.message;
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (onComplete) onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Split chunks by double newline which is standard SSE delimiter
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ""; // Keep the incomplete chunk in the buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          // Parse lines like "event: something\ndata: { ... }" or "data: { ... }"
          const linesParts = line.split('\n');
          let eventType = 'message';
          let dataStr = '';
          
          for (const part of linesParts) {
            if (part.startsWith('event:')) {
              eventType = part.slice(6).trim();
            } else if (part.startsWith('data:')) {
              dataStr += part.slice(5).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              if (onChunk) onChunk({ event: eventType, data });
            } catch (err) {
              console.error("Failed to parse SSE JSON:", dataStr, err);
            }
          }
        }
      }
    } catch (error) {
      console.error("SSE Streaming Error:", error);
      if (onError) onError(error);
    }
  }
};

export default chatMessageService;
