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
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import api from "../utils/api";
import { setAuth } from "../utils/auth";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
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
              Create Your Account
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Set up access to your support workspace and for support in a few
              quick steps.
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

              {/* Password */}
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Confirm Password */}
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                margin="normal"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
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

      <Box
        sx={{
          display: { xs: "none", md: "block" },
          flex: 1,
          minHeight: "100vh",
          backgroundColor: "primary.main",
          backgroundImage: "url('/images/auth-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Box
          component="img"
          src="/images/logo.jpg"
          alt="Logo"
          sx={{
            position: "absolute",
            top: "50%",
            left: { xs: "50%", md: "70%" }, // Center on mobile, center of right 60% on desktop
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

export default Register;
