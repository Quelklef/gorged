import flags


def row_of(string, substring):
    if substring not in string:
        raise ValueError("Substring must be in string")
    return string[: string.index(substring)].count("\n")


def supplant_flag_docs(markdown, flag_docs):
    begin_row = row_of(markdown, "BEGIN FLAG DOCS")
    end_row = row_of(markdown, "END FLAG DOCS")

    return (
        "\n".join(markdown.split("\n")[: begin_row + 1])
        + "\n\n"
        + flag_docs
        + "\n\n"
        + "\n".join(markdown.split("\n")[end_row:])
    )


if __name__ == "__main__":
    with open("README.md", "r") as f:
        existing_md = f.read()
    flag_docs = flags.generate_flag_docs()
    new_md = supplant_flag_docs(existing_md, flag_docs)
    with open("README.md", "w") as f:
        f.write(new_md)
