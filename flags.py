import ast
import glob
import os
import textwrap
from collections import namedtuple

Flag = namedtuple("Flag", "name description")


class Flagset:
    def __init__(self, *, universe, enabled):
        self.__dict__ = {flag.name: (flag in enabled) for flag in universe}


def parse_branch(node):
    """
    Determines if the given AST node is of the form
    > if config.FLAG_NAME:
    >     '''FLAG_DESC'''
    >     STATEMENTS
    If it is, returns (FLAG_NAME, FLAG_DESC).
    If it is not, returns None.
    """
    if (
        isinstance(node, ast.If)
        and isinstance(node.test, ast.Attribute)
        and isinstance(node.test.value, ast.Name)
        and node.test.value.id == "flagset"
        and isinstance(node.body[0], ast.Expr)
        and isinstance(node.body[0].value, ast.Constant)
        and isinstance(node.body[0].value.value, str)
    ):
        flag_name = node.test.attr
        flag_desc = node.body[0].value.value

        # trim the flag_desc literal
        flag_desc = textwrap.dedent(flag_desc)
        if flag_desc and flag_desc[0] == "\n":
            flag_desc = flag_desc[1:]
        if flag_desc and flag_desc[-1] == "\n":
            flag_desc = flag_desc[:-1]

        return Flag(flag_name, flag_desc)


def find_flags():
    flags = set()
    for py_file_loc in glob.iglob("**.py", recursive=True):
        with open(py_file_loc, "r") as py_file:
            module = ast.parse(py_file.read(), filename=py_file.name)
            for node in ast.walk(module):
                maybe_flag = parse_branch(node)
                if maybe_flag is not None:
                    flags.add(maybe_flag)
    return flags


def generate_flag_docs():
    flags = sorted(find_flags(), key=lambda f: f.name)
    return "\n".join(f"- `{flag.name}`: {flag.description}" for flag in flags)


def make_flagset():
    flags = find_flags()

    disabled_names = set(os.getenv("GORGE_DISABLED_FLAGS", "").split(",")) - {""}

    unrecognized = disabled_names - {flag.name for flag in flags}
    if unrecognized:
        raise ValueError("Unrecognized flag(s): " + ", ".join(map(repr, unrecognized)))

    enabled = {flag for flag in flags if flag.name not in disabled_names}
    return Flagset(universe=flags, enabled=enabled)
