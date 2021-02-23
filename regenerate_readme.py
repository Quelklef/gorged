from intercepts import intercepts


def join_surround(delimiter, items):
    return delimiter + delimiter.join(items) + delimiter


def row_of(string, substring):
    if substring not in string:
        raise ValueError("Substring must be in string")
    return string[: string.index(substring)].count("\n")


def make_docs(markdown, intercepts):
    begin_row = row_of(markdown, "BEGIN FLAG DOCS")
    end_row = row_of(markdown, "END FLAG DOCS")

    return (
        "\n".join(markdown.split("\n")[: begin_row + 1])
        + "\n\n"
        + make_table(intercepts)
        + "\n\n"
        + "\n".join(markdown.split("\n")[end_row:])
    )


def make_table(intercepts):
    return (
        "|Name|Enabled by default?|Description|"
        + "\n|-|-|-|"
        + "\n"
        + "\n".join(
            join_surround(
                "|",
                [
                    "`" + intercept.slug + "`",
                    "✅" if intercept.enabled_by_default else "⛔",
                    intercept.desc,
                ],
            )
            for intercept in intercepts
        )
    )


if __name__ == "__main__":
    with open("README.md", "r") as f:
        existing_md = f.read()
    new_md = make_docs(existing_md, intercepts)
    with open("README.md", "w") as f:
        f.write(new_md)
