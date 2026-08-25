const form = document.getElementById("loginForm");
const errorEl = document.getElementById("loginError");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";
  const button = form.querySelector("button");
  button.disabled = true;
  button.textContent = "Signing in…";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed.");
    window.location.href = "/admin-dashboard.html";
  } catch (error) {
    errorEl.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Sign in";
  }
});
