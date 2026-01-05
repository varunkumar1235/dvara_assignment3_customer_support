import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import api from "../utils/api";
import { setAuth } from "../utils/auth";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...data } = formData;
      const response = await api.post("/auth/register", data);
      setAuth(response.data.token, response.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        width: "100vw",
        maxWidth: "100vw",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {/* Left register panel - ~40% width on desktop */}
      <Box
        sx={{
          width: { xs: "100%", md: "40%" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, md: 6 },
          py: { xs: 6, md: 0 },
          bgcolor: "background.paper",
          boxShadow: { md: 3 },
          zIndex: 1,
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Paper elevation={0} sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h4" component="h1" gutterBottom align="left">
              Create your account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Set up access to your support workspace in a few quick steps.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                margin="normal"
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.4 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Register"}
              </Button>
              <Typography align="center" variant="body2">
                Already have an account? <Link to="/login">Login</Link>
              </Typography>
            </form>
          </Paper>
        </Container>
      </Box>

      {/* Right visual panel - place your image here */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          flex: 1,
          minHeight: "100vh",
          backgroundColor: "primary.main",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundImage: "url('/images/auth-bg.jpg')",
        }}
      />
    </Box>
  );
};

export default Register;
