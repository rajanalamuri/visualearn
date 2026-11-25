"""The language engine (assets/i18n.js) and the Spanish file (assets/i18n/es.json)."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
sys.path.insert(0, str(ROOT / "tests"))
from test_progress import boot, call  # noqa: E402

ES = json.loads((WEB / "assets" / "i18n" / "es.json").read_text(encoding="utf-8"))
PLACEHOLDERS = {"a", "b", "c", "n", "t", "name", "why"}


def tr(ctx, dictionary, text):
    ctx.eval(f"globalThis.T = VLI18n.compile({json.dumps(dictionary)});")
    return call(ctx, f"VLI18n.translate({json.dumps(text)}, T)")


# ---------- the engine ----------

def test_exact_strings_keep_their_surrounding_spaces():
    ctx = boot("i18n.js")
    d = {"Play": "Jugar", "Hello  world": "Hola mundo"}
    assert tr(ctx, d, "Play") == "Jugar"
    assert tr(ctx, d, "  Play ") == " Jugar "
    assert tr(ctx, d, "Hello world") == "Hola mundo"  # spacing in the source does not matter
    assert tr(ctx, d, "Unknown words") is None  # nothing to change
    assert tr(ctx, d, "") is None and tr(ctx, d, "   ") is None


def test_templates_fill_in_numbers_and_names_and_translate_names_inside():
    ctx = boot("i18n.js")
    d = {"{a} of {b} ready": "{a} de {b} listos", "{a} of {b}": "{a} de {b}", "Next: {name} →": "Siguiente: {name} →", "Sliding window": "Ventana deslizante",
         "{t} left today": "Quedan {t} hoy"}
    assert tr(ctx, d, "108 of 108 ready") == "108 de 108 listos"  # the longer template wins
    assert tr(ctx, d, "7 of 7") == "7 de 7"
    assert tr(ctx, d, "Next: Sliding window →") == "Siguiente: Ventana deslizante →"
    assert tr(ctx, d, "Next: Something new →") == "Siguiente: Something new →"  # unknown names stay as they are
    assert tr(ctx, d, "14:57 left today") == "Quedan 14:57 hoy"


def test_a_number_template_can_never_rewrite_an_ordinary_sentence():
    ctx = boot("i18n.js")
    d = {"{a} of {b}": "{a} de {b}", "{n} items": "{n} elementos", "{t} left today": "Quedan {t} hoy"}
    for s in ["Looking at the end of the road", "Most of these are ready", "A lot of items", "Time left today", "3 of x", "some items"]:
        assert tr(ctx, d, s) is None, s


def test_titles_and_breadcrumbs_translate_piece_by_piece():
    ctx = boot("i18n.js")
    d = {"Privacy": "Privacidad", "Arrays and techniques": "Arreglos y técnicas", "Starter · 8+": "Inicial · 8+"}
    assert tr(ctx, d, "Privacy · VisuaLearn") == "Privacidad · VisuaLearn"
    assert tr(ctx, d, "· Arrays and techniques") == "· Arreglos y técnicas"
    assert tr(ctx, d, "Two pointers · Arrays and techniques · VisuaLearn") == "Two pointers · Arreglos y técnicas · VisuaLearn"
    assert tr(ctx, d, "Starter · 8+") == "Inicial · 8+"


def test_translating_twice_changes_nothing_so_the_page_cannot_loop():
    ctx = boot("i18n.js")
    ctx.eval(f"globalThis.T = VLI18n.compile({json.dumps(ES['strings'])});")
    for k, v in ES["strings"].items():
        if "{" in k:
            continue
        again = call(ctx, f"VLI18n.translate({json.dumps(v)}, T)")
        assert again is None or again == v, (k, v, again)


# ---------- the Spanish file ----------

def test_the_file_is_well_formed():
    assert ES["lang"] == "es" and ES["name"] == "Español" and isinstance(ES["version"], int)
    strings = ES["strings"]
    assert len(strings) > 400
    for k, v in strings.items():
        assert isinstance(v, str) and v.strip() and k.strip(), k
        assert k == " ".join(k.split()), f"key has odd spacing: {k!r}"
        assert "<" not in v and ">" not in v, f"no markup in translations: {k!r}"
        ph_k, ph_v = set(re.findall(r"\{(\w+)\}", k)), set(re.findall(r"\{(\w+)\}", v))
        assert ph_k == ph_v and ph_k <= PLACEHOLDERS, (k, v)
    same = [k for k, v in strings.items() if k == v and "{" not in k]
    assert len(same) < 0.1 * len(strings), f"too many untranslated entries: {same[:5]}"


def test_every_topic_and_lesson_name_is_translated():
    ctx = boot("catalog.js")
    dsa = call(ctx, "VLCatalog.DSA")
    names = {tr_ for tr_, _ in dsa} | {t[0] for _, ts in dsa for t in ts} | {v[0] for v in call(ctx, "VLCatalog.IDEAS").values()}
    names |= {l["name"] for l in json.loads((WEB / "assets" / "lessons.json").read_text(encoding="utf-8"))}
    missing = sorted(n for n in names if n not in ES["strings"])
    assert missing == [], f"add Spanish for: {missing}"


def test_everyday_runtime_messages_are_covered():
    ctx = boot("i18n.js")
    ctx.eval(f"globalThis.T = VLI18n.compile({json.dumps(ES['strings'])});")
    t = lambda s: call(ctx, f"VLI18n.translate({json.dumps(s)}, T)")
    assert t("Nova, you have explored 12 of 129 ideas on this device.") == "Nova, has explorado 12 de 129 ideas en este dispositivo."
    assert t("Hi, Nova. This is your page.") == "Hola, Nova. Esta es tu página."
    assert t("Next: Sliding window →") == "Siguiente: Ventana deslizante →"
    assert t("14:57 left today") == "Quedan 14:57 hoy"
    assert t("Starter · ages 8+") == "Inicial · 8+ años"
    assert t("Too many tries. Please wait 42 seconds.") == "Demasiados intentos. Espera 42 segundos."
    assert t("What is (17 × 14) + 33?") == "¿Cuánto es (17 × 14) + 33?"
    assert t("Loaded: 2 added, 1 merged.") == "Cargado: 2 añadidos, 1 combinados."
    assert t("Grade 7") == "Curso 7"


# ---------- other languages stay usable ----------

def test_parents_in_another_language_get_the_numeric_question_only():
    ctx = boot("parents.js")
    for r in [0.0, 0.2, 0.49, 0.5, 0.7, 0.99]:
        g = call(ctx, f"VLParents.gate((() => {{ let i = 0; const seq = [{r}, 0.3, 0.6, 0.9]; return () => seq[i++ % 4]; }})(), 'es')")
        assert g["kind"] == "sum", "number words are English, so a Spanish-speaking parent must never get them"
    kinds = {call(ctx, f"VLParents.gate(() => {r}, 'en')")["kind"] for r in (0.1, 0.9)}
    assert kinds == {"sum", "words"}  # English still gets both


def test_every_page_loads_the_language_engine_and_offers_a_picker():
    for page in WEB.rglob("*.html"):
        if page.name.startswith("_"):
            continue
        assert "/assets/i18n.js" in page.read_text(encoding="utf-8"), page.relative_to(WEB)
    sw = (WEB / "sw.js").read_text(encoding="utf-8")
    assert "/assets/i18n.js" in sw
