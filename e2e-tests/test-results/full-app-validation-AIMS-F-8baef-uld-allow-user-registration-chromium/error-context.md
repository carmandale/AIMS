# Page snapshot

```yaml
- img
- heading "Create account" [level=1]
- paragraph: Join us today
- text: Email address
- img
- textbox "Email address": test_1753612122863@aims.com
- text: Password
- img
- textbox "Password": TestPassword123!
- button:
  - img
- text: Confirm password
- img
- textbox "Confirm password": TestPassword123!
- button:
  - img
- checkbox "I accept the Terms and Conditions" [checked]
- text: I accept the
- link "Terms and Conditions":
  - /url: "#"
- button [disabled]
- paragraph:
  - text: Already have an account?
  - button "Sign in"
- region "Notifications alt+T"
- button "Open Tanstack query devtools":
  - img
```