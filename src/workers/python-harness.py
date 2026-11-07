import json, io, contextlib, ast, tempfile, os
def _arena_run(raw):
    request = json.loads(raw)
    class LimitedOutput(io.StringIO):
        def write(self, text):
            if self.tell() + len(text) > 12000:
                raise RuntimeError("Слишком много вывода. Лимит 12 000 символов.")
            return super().write(text)
    output = LimitedOutput()
    inputs = iter(request.get("stdin", "").splitlines())
    def read_input(prompt=""):
        if prompt:
            print(prompt, end="")
        try:
            return next(inputs)
        except StopIteration:
            raise EOFError("Недостаточно строк в поле ввода")
    namespace = {"__name__": "__main__", "input": read_input}
    result = {"output": "", "error": "", "tests": [], "variables": []}
    previous = os.getcwd()
    with tempfile.TemporaryDirectory() as directory:
        try:
            os.chdir(directory)
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                exec(compile(request["code"], "<ученик>", "exec"), namespace)
            result["output"] = output.getvalue()
            def rerun(overrides):
                tree = ast.parse(request["code"])
                tree.body = [node for node in tree.body if not (isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in overrides for t in node.targets))]
                values = dict(overrides)
                with contextlib.redirect_stdout(LimitedOutput()):
                    exec(compile(ast.fix_missing_locations(tree), "<проверка>", "exec"), values)
                return values
            namespace.update({"__output__": result["output"], "__source__": request["code"], "ast": ast, "__rerun__": rerun})
            for check in request.get("checks", []):
                try:
                    with contextlib.redirect_stdout(LimitedOutput()):
                        passed = bool(eval(check["expression"], namespace))
                except Exception:
                    passed = False
                result["tests"].append({"label": check["label"], "passed": passed})
            for key, value in list(namespace.items()):
                if key.startswith("_") or key in ("input", "ast") or callable(value) or isinstance(value, type(json)):
                    continue
                result["variables"].append({"name": key, "type": type(value).__name__, "value": repr(value)[:140]})
                if len(result["variables"]) >= 8:
                    break
        except BaseException as error:
            result["output"] = output.getvalue()
            line = getattr(error, "lineno", None)
            tb = error.__traceback__
            while tb:
                if tb.tb_frame.f_code.co_filename == "<ученик>":
                    line = tb.tb_lineno
                tb = tb.tb_next
            result["error"] = type(error).__name__ + (f", строка {line}" if line else "") + ": " + str(error)[:1000]
        finally:
            os.chdir(previous)
    return json.dumps(result, ensure_ascii=False)
_arena_run(__arena_request)
