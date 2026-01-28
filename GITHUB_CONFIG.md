# GitHub Ruleset Configuration

Based on the screen you are viewing, here is how to configure the protections for your `main` branch. This ensures your code history is safe and changes are intentional.

## 1. Create the Ruleset
1. Click the green **New ruleset** button.
2. Select **New branch ruleset**.

## 2. Basic Setup
- **Name**: Enter `Main Protection`.
- **Enforcement status**: Select **Active**.

## 3. Targets
- Under **Target branches**:
  - Click **Add target**.
  - Select **Include default branch** (this will automatically select `main`).

## 4. Rules (Check these boxes)
Enable the following protections:

### 🔒 Critical Safety
- [x] **Restrict deletions**
  - *Why*: Prevents accidental deletion of your codebase.
- [x] **Restrict updates** (Block force pushes)
  - *Why*: Prevents overwriting history (e.g., `git push -f`), which can lose commits.

### 🤝 Collaboration (Optional but Recommended)
- [x] **Require a pull request before merging**
  - *Why*: Forces you to create a branch, make changes, and then "merge" them, effectively double-checking your work.
  - *Settings*: Set "Required approvals" to `0` if you are working alone (so you can merge your own PRs), or `1` if you want a teammate to review.

## 5. Finish
- Scroll to the bottom and click **Create**.
