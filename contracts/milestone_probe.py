# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import hashlib
import json


class MilestoneProbe(gl.Contract):
    result: str

    def __init__(self):
        self.result = ""

    @gl.public.write
    def check_source(self, repo: str, sha: str, path: str) -> None:
        base = "https://api.github.com/repos/" + repo
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "Contrary-StudioNet"}

        def fetch_all():
            items = []
            for url in (base, base + "/git/commits/" + sha,
                        "https://raw.githubusercontent.com/" + repo + "/" + sha + "/" + path):
                response = gl.nondet.web.get(url, headers=headers)
                if response.status != 200 or len(response.body) == 0 or len(response.body) > 20000:
                    raise gl.vm.UserError("[SOURCE_UNAVAILABLE] Probe fetch failed")
                items.append({"status": response.status, "bytes": len(response.body),
                              "sha256": hashlib.sha256(response.body).hexdigest()})
            return json.dumps(items, sort_keys=True, separators=(",", ":"))

        self.result = gl.eq_principle.strict_eq(fetch_all)

    @gl.public.view
    def get_result(self) -> str:
        return self.result
