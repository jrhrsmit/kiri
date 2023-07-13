import typer
from pathlib import Path
import re
import git
import logging
from rich.logging import RichHandler

logging.basicConfig(
    level=logging.WARN,
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(rich_tracebacks=True)],
)
log = logging.getLogger("rich")


def short_hashes(graph: dict, len=7) -> dict:
    short_graph = {}

    for commit in graph:
        short_hash = commit[0:len]
        short_graph[short_hash] = graph[commit]
        short_graph[short_hash]["parents"] = [
            p[0:len] for p in graph[commit]["parents"]
        ]
        short_graph[short_hash]["children"] = [
            p[0:len] for p in graph[commit]["children"]
        ]

    return short_graph


def generate_commit_graph(repository_path: Path) -> tuple[dict, str]:
    graph = {}

    # Open the Git repository
    repo = git.Repo(repository_path)

    head = repo.head  # the head points to the active branch/ref
    master = head.reference  # retrieve the reference the head points to
    # master.commit  # from here you use it as any other reference

    # graph["master"] = {"parents": [master.commit.hexsha]}

    heads = []
    for head in repo.branches:
        # name = re.sub(r"^" + re.escape("refs/heads/"), "", head.ref.name)
        # heads += [head.ref.name]
        # graph[head.commit.hexsha]["branches"] += [head.ref.name]

        # Add a vertex for each commit
        for commit in repo.iter_commits(rev=head.commit):
            graph[commit.hexsha] = {
                "parents": [p.hexsha for p in commit.parents],
                "subject": commit.message.strip().splitlines()[0],
                "message": commit.message.strip(),
                "author": commit.author.name,
                "email": commit.author.email,
                "timestamp": commit.committed_datetime,
                "tag": "",
                "children": [],
                "branches": [],
                "branch": "",
            }
            graph[commit.hexsha]["body"] = re.sub(
                "[\r\n]+",
                "\n",
                commit.message.removeprefix(graph[commit.hexsha]["subject"]).strip(),
            )

    # add children for each commit
    for commit in graph:
        for parent in graph[commit]["parents"]:
            if commit not in graph[parent]["children"]:
                graph[parent]["children"] += [commit]
                if commit.startswith("2822155"):
                    log.debug(
                        f"Setting commit {parent} to children {graph[parent]['children']}"
                    )

    # add tags
    for tag in repo.tags:
        graph[tag.commit.hexsha]["tag"] = tag.name

    # add branch names
    commit = master.commit
    while True:
        graph[commit.hexsha]["branch"] = master.name
        # first parent follows the branch (I think)
        if commit.parents:
            commit = commit.parents[0]
        else:
            break

    for head in repo.branches:
        commit = head.commit
        while True:
            if graph[commit.hexsha]["branch"]:
                break
            graph[commit.hexsha]["branch"] = head.name
            # first parent follows the branch (I think)
            if commit.parents:
                commit = commit.parents[0]
            else:
                break

    for head in repo.branches:
        # name = re.sub(r"^" + re.escape("refs/heads/"), "", head.ref.name)
        commit = head.commit
        graph[commit.hexsha]["branches"] += [head.name]

    # find initial commit
    initial_commit = {"timestamp": master.commit.committed_datetime, "hash": []}
    for commit, details in graph.items():
        if "timestamp" not in details:
            continue
        if details["timestamp"] < initial_commit["timestamp"]:
            initial_commit["timestamp"] = details["timestamp"]
            initial_commit["hash"] = commit

    return (graph, initial_commit["hash"])


def gitgraph_branch_var(branch: str) -> str:
    branch_var = "b_" + branch.replace("-", "_").replace(".", "_").replace(
        ".", "_"
    ).replace("/", "_")
    return branch_var


def select_next_child(graph: dict, children_remaining: list) -> tuple[list, str]:
    children = {}

    for c in children_remaining:
        children[c] = graph[c]

    oldest_child = children_remaining[0]

    for c in children_remaining[1:]:
        if graph[oldest_child]["timestamp"] > graph[c]["timestamp"]:
            oldest_child = c

    children_remaining.remove(oldest_child)
    return (children_remaining, oldest_child)


def commit_graph_to_gitgraph_js(graph: dict, initial_commit: str) -> str:
    template = """
        gitgraph_template = GitgraphJS.templateExtend(GitgraphJS.TemplateName.Metro,
        {
            colors: ["#fff", "#999", "#ccc", "#666"],
            tag: {
                color: "#000",
                font: "normal 10pt monospace",
            },
            branch: {
                lineWidth: 4,
                spacing: 20,
                label: {
                    color: "#000",
                    font: "normal 10pt monospace",
                },
            },
            commit: {
                dot: {
                    size: 8,
                },
                spacing: 30,
                message: {
                    color: "#fff",
                    font: "normal 10pt monospace",
                },
            },
        });"""
    gitgraph_js = template
    gitgraph_js += """
        const gitgraph = GitgraphJS.createGitgraph(document.getElementById("gitGraphContainer"), {
            mode: "extended",
            template: gitgraph_template,
        });"""

    commit = initial_commit

    created_branches = {}
    children_remaining = []
    commits_parsed = []
    # find initial commit
    while commit:
        log.debug(f"Parsing commit {commit}")
        log.debug(f"\tParents:")
        for parent in graph[commit]["parents"]:
            log.debug("\t\t" + parent)
        log.debug(f"\tChildren:")
        for child in graph[commit]["children"]:
            log.debug("\t\t" + child)
        log.debug(f"\tChildren remaining:")
        for child in children_remaining:
            log.debug("\t\t" + child)

        # Create the .tag JS string
        if graph[commit]["tag"]:
            tag_str = f'.tag("{graph[commit]["tag"]}")'
        else:
            tag_str = ""

        # Create branch if it doesn't exist yet
        branch_var = gitgraph_branch_var(graph[commit]["branch"])
        if graph[commit]["branch"] not in created_branches:
            parents = graph[commit]["parents"]
            if len(parents) == 0:
                # initial commit, use the method from gitgraph
                parent_branch_var = "gitgraph"
            else:
                # else branch off the parent branch
                parent_branch = graph[parents[0]]["branch"]
                parent_branch_var = created_branches[parent_branch]
            created_branches[graph[commit]["branch"]] = branch_var
            log.info(f"Creating branch {branch_var}")
            gitgraph_js += f'const {branch_var} = {parent_branch_var}.branch("{graph[commit]["branch"]}");\n'

        # Create commit options for gitgraph
        # commit_options = f'{{subject: "{graph[commit]["subject"]}", body: `{graph[commit]["body"]}`, author: "{graph[commit]["author"]} <{graph[commit]["email"]}>", timestamp: "{graph[commit]["timestamp"]}", hash: "{commit}", tag: "{graph[commit]["tag"]}"}}'
        tooltip = f"""{graph[commit]["author"]}\n{graph[commit]["email"]}\non {graph[commit]["timestamp"]}\n\n{graph[commit]["message"]}"""
        gitgraph_js += f"""function show_commit_details_{commit}(){{
                show_commit_details(`{tooltip}`)
            }}
            """
        gitgraph_js += f"""function commit_click_{commit}(){{
                commit_click("{commit}")
            }}
            """
        commit_options = f"""{{subject: "{graph[commit]["subject"]}",
                            onMouseOver: show_commit_details_{commit},
                            onMouseOut: hide_commit_details,
                            onClick: commit_click_{commit},
                            onMessageClick: commit_click_{commit},
                            author: "{graph[commit]["author"]} <{graph[commit]["email"]}>",
                            timestamp: "{graph[commit]["timestamp"]}",
                            hash: "{commit}", tag: "{graph[commit]["tag"]}"}}
                            """

        # Create the commit
        if len(graph[commit]["parents"]) <= 1:
            # Create a single commit if just has one parent
            log.info(f"Adding commit {commit} on branch {branch_var}")
            gitgraph_js += f"{branch_var}.commit({commit_options});\n"
        elif len(graph[commit]["parents"]) == 2:
            # Create a merge commit if it has two parents
            parents = graph[commit]["parents"]
            parent_branches = [graph[parent]["branch"] for parent in parents]
            if parents[0] not in commits_parsed or parents[1] not in commits_parsed:
                # if either of the parent commits isn't created yet, wait for that branch to catch up
                if len(children_remaining) == 0:
                    log.error(f"Merge commit with orphaned commit? {commit}")
                    break
                else:
                    log.debug(
                        f"Branch {graph[commit]['branch']} blocked by merge commit {commit}, waiting for commit {[c for c in parents if c not in commits_parsed]}"
                    )
                    children_remaining, commit = select_next_child(
                        graph, children_remaining
                    )
                    # commits_parsed += commit
                    continue

            log.debug(f"Branch {graph[commit]['branch']} unblocked, merging")

            if parent_branches[1] == graph[commit]["branch"]:
                src_branch_var = gitgraph_branch_var(parent_branches[0])
                tgt_branch_var = gitgraph_branch_var(parent_branches[1])
            elif parent_branches[0] == graph[commit]["branch"]:
                src_branch_var = gitgraph_branch_var(parent_branches[1])
                tgt_branch_var = gitgraph_branch_var(parent_branches[0])
            else:
                log.error(
                    f"Branches of parent commit do not match branch of merge commit: {commit}"
                )

            log.info(f"Adding commit {commit} on branch {tgt_branch_var}")
            gitgraph_js += f"{tgt_branch_var}.merge({{branch: {src_branch_var}, commitOptions: {commit_options}}}){tag_str};\n"
        else:
            log.error(f"More than 2 parents for commit {commit}")

        commits_parsed += [commit]

        for child in graph[commit]["children"]:
            if child not in children_remaining:
                children_remaining += [child]

        if len(children_remaining) == 0:
            break

        children_remaining, commit = select_next_child(graph, children_remaining)

    return gitgraph_js


def main(git_dir: Path, output_file: typer.FileTextWrite):
    # Generate the commit graph
    graph, initial_commit = generate_commit_graph(git_dir)
    hash_len = 7
    graph = short_hashes(graph)
    initial_commit = initial_commit[0:hash_len]
    js = commit_graph_to_gitgraph_js(graph, initial_commit)

    output_file.write(js)

    exit()


if __name__ == "__main__":
    typer.run(main)
