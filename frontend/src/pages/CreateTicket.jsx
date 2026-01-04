import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  MenuItem,
  Chip,
} from "@mui/material";
import { AttachFile } from "@mui/icons-material";
import api from "../utils/api";

const CreateTicket = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    // Limit to 5 files
    if (files.length + selectedFiles.length > 5) {
      setError("Maximum 5 files allowed");
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
    setError("");
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append("priority", formData.priority);

      selectedFiles.forEach((file) => {
        submitData.append("files", file);
      });

      await api.post("/tickets", submitData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Create New Ticket
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={6}
              required
            />
            <TextField
              fullWidth
              select
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              margin="normal"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </TextField>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFile />}
                sx={{ mb: 1 }}
              >
                Attach Files (Images, PDFs, Text, Videos)
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*,.pdf,.txt,video/*"
                  onChange={handleFileChange}
                />
              </Button>
              {selectedFiles.length > 0 && (
                <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {selectedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      onDelete={() => removeFile(index)}
                      size="small"
                    />
                  ))}
                </Box>
              )}
            </Box>
            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : "Create Ticket"}
              </Button>
              <Button variant="outlined" onClick={() => navigate("/")}>
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreateTicket;
