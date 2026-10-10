# project-tint

A Claude Code mod that marks each project with its own color, so you always know which context you're working in.

- A colored bar above the prompt with the project name and path
- Your prompts framed in the project color, so scrollback shows the context too
- The project name in the status line

Every project gets a stable color automatically, based on the folder Claude Code was started in. Works in the terminal and in the Code tab of the desktop app.

## Install

In a Claude Code session:

```
/plugin install project-tint --marketplace loucimj/project-tint
```

Answer `y` to add the marketplace, then pick the user scope so it runs in every project.

## Usage

```
/project-color                      show this project's name and color
/project-color green Qontact API    set color and display name
/project-color #7c3aed              set a hex color
/project-color list                 projects you've customized
/project-color reset                back to the automatic color
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
