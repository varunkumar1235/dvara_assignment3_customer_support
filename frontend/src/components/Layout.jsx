import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  Chip,
} from "@mui/material";
import { AccountCircle } from "@mui/icons-material";
import { clearAuth, getUser, getUserRole } from "../utils/auth";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const user = getUser();
  const role = getUserRole();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
    handleClose();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar position="fixed" elevation={2}>
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: "none",
              color: "inherit",
              fontWeight: 600,
            }}
          >
            Dvara Helpdesk
          </Typography>
          {user && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Chip
                label={role}
                size="small"
                color="default"
                sx={{ textTransform: "capitalize" }}
              />
              <Typography variant="body2">{user.username}</Typography>
              <Button
                color="inherit"
                onClick={handleMenu}
                startIcon={<AccountCircle />}
              >
                Account
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          pt: { xs: 7, sm: 8 },
          pb: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
