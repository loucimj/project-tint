# project-tint

A Claude Code mod that marks each chat with its own color, so you always know which context you're working in.

- A colored bar above the prompt with the context name and the project path
- Your prompts framed in the same color, so scrollback shows the context too
- The context name in the status line

In the Code tab of the desktop app the color follows the **sidebar group** the chat is filed under, so every chat in a group shares a color, whatever folder it runs in. A chat in no group, or one in the terminal, is colored by its **project folder** instead. Both get a stable color automatically; moving a chat to another group recolors it within a few seconds.

## Install

In a Claude Code session:

```
/plugin install project-tint --marketplace loucimj/project-tint
```

Answer `y` to add the marketplace, then pick the user scope so it runs in every project.

## Usage

```
/project-color                      show this chat's group, project and color
/project-color green Backend        set color and display name (of the group when in one, else the project)
/project-color #7c3aed              set a hex color
/project-color project blue Web     set the project's color even while in a group
/project-color list                 groups and projects you've customized
/project-color reset                back to the automatic color (add `project` to reset the project)
/project-color prompts off          stop framing your prompts
```

Named colors: purple, blue, sky, teal, green, amber, orange, red, pink, slate.

Settings are kept across sessions.

## Develop

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```
