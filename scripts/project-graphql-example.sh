#!/bin/bash

# Example of using GitHub GraphQL API for projects
# First, get your project ID

echo "Getting user ID..."
USER_ID=$(gh api graphql -f query='
  query {
    viewer {
      id
      login
    }
  }
' --jq '.data.viewer.id')

echo "User ID: $USER_ID"

echo "Getting projects..."
gh api graphql -f query='
  query($login: String!) {
    user(login: $login) {
      projectsV2(first: 20) {
        nodes {
          id
          title
          number
        }
      }
    }
  }
' -f login="acedergren" --jq '.data.user.projectsV2.nodes[] | "\(.number): \(.title) (\(.id))"'

# To add an item to a project, you would use:
# gh api graphql -f query='
#   mutation($projectId: ID!, $contentId: ID!) {
#     addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
#       item {
#         id
#       }
#     }
#   }
# ' -f projectId="PROJECT_ID" -f contentId="ISSUE_ID"