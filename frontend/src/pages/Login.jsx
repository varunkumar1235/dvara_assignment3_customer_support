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

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
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
    setLoading(true);

    try {
      const response = await api.post("/auth/login", formData);
      setAuth(response.data.token, response.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
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
      {/* Left auth panel - ~40% width on desktop */}
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
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              align="left"
              sx={{
                fontWeight: 600,
                letterSpacing: "-0.02em",
                fontFamily: `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`,
              }}
            >
              Customer Helpdesk
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to resolve tickets or to file a ticket as a customer
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <form onSubmit={handleSubmit}>
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
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.4 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Login"}
              </Button>
              <Typography align="center" variant="body2">
                Don't have an account? <Link to="/register">Register</Link>
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
          // To use your own image, put it in `frontend/public/images/auth-bg.jpg`
          // and then uncomment the line below:
          backgroundImage: "url('/images/auth-bg.jpg')",
        }}
      >
        <Box
             component="img"
             src="/images/logo.jpg"
             alt="Logo"
             sx={{
               position: "absolute",
               top: "50%",
               left: { xs: "50%", md: "70%" }, // Center on mobile, center of right 60% on desktop (40% + 30% = 70%)
               transform: "translate(-50%, -50%)",
               width: "150px",
               height: "auto",
               borderRadius: "50%",
               boxShadow: 3,
             }}
        />
      </Box>
    </Box>
  );
};

export default Login;
