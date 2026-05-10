import axiosInstance from "./axios";

const sourceService = {
  // Upload a document (PDF, DOCX, TXT, MD)
  uploadDocument: async (formData) => {
    // formData should contain 'title' and 'file'
    const response = await axiosInstance.post("/sources/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Add a GitHub repository
  addGithub: async (data) => {
    const response = await axiosInstance.post("/sources/github", data);
    return response.data;
  },

  // Get all sources (paginated)
  getSources: async (params) => {
    const response = await axiosInstance.get("/sources/", { params });
    return response.data;
  },

  // Get a specific source by ID
  getSourceById: async (sourceId) => {
    const response = await axiosInstance.get(`/sources/${sourceId}`);
    return response.data;
  },

  // Delete a source
  deleteSource: async (sourceId) => {
    const response = await axiosInstance.delete(`/sources/${sourceId}`);
    return response.data;
  },

  // Get the SSE URL for source status
  getSourceStatusUrl: (sourceId) => {
    const baseURL = axiosInstance.defaults.baseURL || "http://localhost:8000/api/v1";
    const cleanBaseURL = baseURL.replace(/\/+$/, "");
    return `${cleanBaseURL}/sources/${sourceId}/status`;
  },

  // Subscribe to real-time indexing status via Server-Sent Events (SSE)
  subscribeToSourceStatus: (sourceId, callbacks = {}) => {
    const url = sourceService.getSourceStatusUrl(sourceId);
    // withCredentials true is crucial for passing the auth cookies to the SSE endpoint
    const es = new EventSource(url, { withCredentials: true });

    if (callbacks.onSnapshot) {
      es.addEventListener("snapshot", (e) => callbacks.onSnapshot(JSON.parse(e.data)));
    }
    if (callbacks.onStatusChanged) {
      es.addEventListener("source_status_changed", (e) => callbacks.onStatusChanged(JSON.parse(e.data)));
    }
    if (callbacks.onIndexChanged) {
      es.addEventListener("source_index_changed", (e) => callbacks.onIndexChanged(JSON.parse(e.data)));
    }
    
    es.addEventListener("complete", (e) => {
      if (callbacks.onComplete) callbacks.onComplete(JSON.parse(e.data));
      es.close();
    });

    es.onerror = (err) => {
      console.error("SSE error occurred for source:", sourceId, err);
      if (callbacks.onError) callbacks.onError(err);
      es.close();
    };

    return es;
  }
};

export default sourceService;
