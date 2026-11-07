import json, io, contextlib, ast, tempfile, os, sys, reprlib
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
    result = {"output": "", "error": "", "tests": [], "variables": [], "trace": [], "traceTruncated": False}
    pending = {}
    def safe_repr(value, depth=0):
        kind = type(value)
        if kind in (str, int, float, bool, type(None)):
            try:
                return reprlib.repr(value)
            except Exception:
                return "<" + kind.__name__ + ">"
        if depth >= 2:
            return "…"
        if kind is dict:
            parts = []
            for i, (key, item) in enumerate(value.items()):
                if i == 5:
                    parts.append("…")
                    break
                parts.append(safe_repr(key, depth+1) + ": " + safe_repr(item, depth+1))
            return "{" + ", ".join(parts) + "}"
        if kind in (list, tuple, set):
            parts = []
            for i, item in enumerate(value):
                if i == 6:
                    parts.append("…")
                    break
                parts.append(safe_repr(item, depth+1))
            if kind is set and not parts:
                return "set()"
            start, end = ("[", "]") if kind is list else ("(", ")") if kind is tuple else ("{", "}")
            return start + ", ".join(parts) + ("," if kind is tuple and len(value) == 1 else "") + end
        return "<" + kind.__name__ + ">"
    def snapshot(values):
        items = []
        for key, value in list(values.items()):
            if not isinstance(key, str) or key.startswith("_") or key in ("input", "ast") or callable(value) or isinstance(value, type(json)):
                continue
            # Avoid invoking user-defined __repr__ methods during observation.
            text = safe_repr(value)
            items.append({"name": key, "type": type(value).__name__, "value": text[:140]})
            if len(items) == 8:
                break
        return items
    def record(frame, line, event):
        if len(result["trace"]) >= 120:
            result["traceTruncated"] = True
            return
        result["trace"].append({"line": line, "event": event, "scope": frame.f_code.co_name,
            "variables": snapshot(frame.f_locals), "output": output.getvalue()[-2000:]})
    def trace(frame, event, arg):
        if frame.f_code.co_filename != "<ученик>":
            return None
        if event == "line":
            previous_line = pending.get(id(frame))
            if previous_line is not None:
                record(frame, previous_line, "step")
            pending[id(frame)] = frame.f_lineno
        elif event in ("return", "exception"):
            previous_line = pending.pop(id(frame), None)
            if previous_line is not None:
                record(frame, previous_line, "exception" if event == "exception" else "step")
        return trace
    previous_trace = sys.gettrace()
    previous = os.getcwd()
    with tempfile.TemporaryDirectory() as directory:
        try:
            os.chdir(directory)
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                compiled = compile(request["code"], "<ученик>", "exec")
                sys.settrace(trace)
                try:
                    exec(compiled, namespace)
                finally:
                    sys.settrace(previous_trace)
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
            result["variables"] = snapshot(namespace)
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
            sys.settrace(previous_trace)
            os.chdir(previous)
    return json.dumps(result, ensure_ascii=False)
_arena_run(__arena_request)
