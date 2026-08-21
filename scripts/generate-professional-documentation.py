"""Generate exhibition-ready LeakShield Pro documentation PDFs."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
REPORT_PATH = OUTPUT_DIR / "LeakShield-Pro-Complete-Jury-Documentation.pdf"
SCRIPT_PATH = OUTPUT_DIR / "LeakShield-Pro-One-Minute-Video-Script.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4

NAVY = HexColor("#071827")
NAVY_2 = HexColor("#0C2538")
INK = HexColor("#10263A")
SLATE = HexColor("#496176")
MUTED = HexColor("#72869A")
TEAL = HexColor("#17B8A6")
TEAL_DARK = HexColor("#0D776F")
CYAN = HexColor("#4CCEE8")
PALE_TEAL = HexColor("#E9F8F6")
PALE_BLUE = HexColor("#EEF5FA")
PALE_GOLD = HexColor("#FFF6DF")
GOLD = HexColor("#D8A52C")
RED = HexColor("#BA3A4A")
PALE_RED = HexColor("#FCECEF")
BORDER = HexColor("#D7E2EA")
PAPER = HexColor("#F7FAFC")
WHITE = colors.white


def register_fonts() -> None:
    fonts = {
        "LSPBody": Path("C:/Windows/Fonts/calibri.ttf"),
        "LSPBody-Bold": Path("C:/Windows/Fonts/calibrib.ttf"),
        "LSPBody-Italic": Path("C:/Windows/Fonts/calibrii.ttf"),
        "LSPDisplay": Path("C:/Windows/Fonts/segoeui.ttf"),
        "LSPDisplay-Bold": Path("C:/Windows/Fonts/segoeuib.ttf"),
        "LSPMono": Path("C:/Windows/Fonts/consola.ttf"),
    }
    for name, path in fonts.items():
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))

    pdfmetrics.registerFontFamily(
        "LSPBody",
        normal="LSPBody",
        bold="LSPBody-Bold",
        italic="LSPBody-Italic",
        boldItalic="LSPBody-Bold",
    )


register_fonts()


def build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=10.1,
            leading=14.2,
            textColor=INK,
            spaceAfter=7,
        ),
        "body_small": ParagraphStyle(
            "BodySmall",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=8.5,
            leading=11.3,
            textColor=SLATE,
            spaceAfter=4,
        ),
        "lead": ParagraphStyle(
            "Lead",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=13,
            leading=18,
            textColor=SLATE,
            spaceAfter=13,
        ),
        "h1": ParagraphStyle(
            "Heading1",
            parent=base["Heading1"],
            fontName="LSPDisplay-Bold",
            fontSize=22,
            leading=26,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=12,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "Heading2",
            parent=base["Heading2"],
            fontName="LSPDisplay-Bold",
            fontSize=14,
            leading=17,
            textColor=TEAL_DARK,
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "Heading3",
            parent=base["Heading3"],
            fontName="LSPBody-Bold",
            fontSize=10.5,
            leading=13,
            textColor=NAVY_2,
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "eyebrow": ParagraphStyle(
            "Eyebrow",
            parent=base["BodyText"],
            fontName="LSPBody-Bold",
            fontSize=8.2,
            leading=10,
            textColor=TEAL_DARK,
            tracking=1.5,
            spaceAfter=5,
        ),
        "cover_kicker": ParagraphStyle(
            "CoverKicker",
            parent=base["BodyText"],
            fontName="LSPBody-Bold",
            fontSize=9,
            leading=11,
            textColor=CYAN,
            tracking=2,
            spaceAfter=14,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="LSPDisplay-Bold",
            fontSize=38,
            leading=41,
            textColor=WHITE,
            alignment=TA_LEFT,
            spaceAfter=8,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=16,
            leading=21,
            textColor=HexColor("#CFE4EF"),
            spaceAfter=18,
        ),
        "cover_meta": ParagraphStyle(
            "CoverMeta",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=9.4,
            leading=13,
            textColor=HexColor("#B9CFDA"),
        ),
        "card_title": ParagraphStyle(
            "CardTitle",
            parent=base["BodyText"],
            fontName="LSPBody-Bold",
            fontSize=10.5,
            leading=13,
            textColor=NAVY,
            spaceAfter=4,
        ),
        "card_body": ParagraphStyle(
            "CardBody",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=8.9,
            leading=12.2,
            textColor=SLATE,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="LSPBody-Bold",
            fontSize=8.4,
            leading=10.5,
            textColor=WHITE,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=8.1,
            leading=10.6,
            textColor=INK,
        ),
        "table_cell_bold": ParagraphStyle(
            "TableCellBold",
            parent=base["BodyText"],
            fontName="LSPBody-Bold",
            fontSize=8.1,
            leading=10.6,
            textColor=NAVY,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=9.7,
            leading=13.5,
            leftIndent=12,
            firstLineIndent=-8,
            bulletIndent=1,
            textColor=INK,
            spaceAfter=4,
        ),
        "number": ParagraphStyle(
            "Number",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=9.7,
            leading=13.5,
            leftIndent=18,
            firstLineIndent=-15,
            textColor=INK,
            spaceAfter=5,
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=base["BodyText"],
            fontName="LSPBody",
            fontSize=9.4,
            leading=13.3,
            textColor=NAVY_2,
        ),
        "quote": ParagraphStyle(
            "Quote",
            parent=base["BodyText"],
            fontName="LSPDisplay-Bold",
            fontSize=17,
            leading=22,
            alignment=TA_CENTER,
            textColor=NAVY,
        ),
        "toc_title": ParagraphStyle(
            "TOCTitle",
            parent=base["Heading1"],
            fontName="LSPDisplay-Bold",
            fontSize=24,
            leading=28,
            textColor=NAVY,
            spaceAfter=16,
        ),
        "toc_level_0": ParagraphStyle(
            "TOCLevel0",
            parent=base["BodyText"],
            fontName="LSPBody-Bold",
            fontSize=10,
            leading=14,
            textColor=NAVY,
            leftIndent=0,
            firstLineIndent=0,
            spaceBefore=4,
        ),
    }


STYLES = build_styles()


class SectionLabel(Flowable):
    def __init__(self, text: str, width: float = 48 * mm):
        super().__init__()
        self.text = text.upper()
        self.width = width
        self.height = 7 * mm

    def draw(self) -> None:
        canvas = self.canv
        canvas.setFillColor(PALE_TEAL)
        canvas.roundRect(0, 0, self.width, self.height, 3.5 * mm, fill=1, stroke=0)
        canvas.setFillColor(TEAL_DARK)
        canvas.setFont("LSPBody-Bold", 7.7)
        canvas.drawString(4 * mm, 2.25 * mm, self.text)


class ProcessFlow(Flowable):
    def __init__(self, labels: list[str]):
        super().__init__()
        self.labels = labels
        self.width = 174 * mm
        self.height = 34 * mm

    def draw(self) -> None:
        canvas = self.canv
        count = len(self.labels)
        gap = 3 * mm
        box_width = (self.width - gap * (count - 1)) / count
        box_height = 20 * mm
        y = 8 * mm
        for index, label in enumerate(self.labels):
            x = index * (box_width + gap)
            canvas.setFillColor(NAVY if index % 2 == 0 else NAVY_2)
            canvas.roundRect(x, y, box_width, box_height, 3 * mm, fill=1, stroke=0)
            canvas.setFillColor(TEAL)
            canvas.circle(x + 5 * mm, y + box_height - 5 * mm, 2.5 * mm, fill=1, stroke=0)
            canvas.setFillColor(WHITE)
            canvas.setFont("LSPBody-Bold", 7.2)
            lines = label.split("\n")
            for line_index, line in enumerate(lines[:3]):
                canvas.drawCentredString(
                    x + box_width / 2,
                    y + 8.5 * mm - line_index * 3.2 * mm,
                    line,
                )
            if index < count - 1:
                canvas.setStrokeColor(TEAL)
                canvas.setLineWidth(1.2)
                start_x = x + box_width
                end_x = start_x + gap
                mid_y = y + box_height / 2
                canvas.line(start_x + 0.7 * mm, mid_y, end_x - 0.7 * mm, mid_y)
                canvas.line(end_x - 1.8 * mm, mid_y + 1.2 * mm, end_x - 0.7 * mm, mid_y)
                canvas.line(end_x - 1.8 * mm, mid_y - 1.2 * mm, end_x - 0.7 * mm, mid_y)


class ArchitectureDiagram(Flowable):
    def __init__(self):
        super().__init__()
        self.width = 174 * mm
        self.height = 72 * mm

    def draw_box(self, x: float, y: float, width: float, height: float, title: str, detail: str, accent: bool = False) -> None:
        canvas = self.canv
        canvas.setFillColor(NAVY if accent else PALE_BLUE)
        canvas.setStrokeColor(TEAL if accent else BORDER)
        canvas.setLineWidth(1)
        canvas.roundRect(x, y, width, height, 3 * mm, fill=1, stroke=1)
        canvas.setFillColor(WHITE if accent else NAVY)
        canvas.setFont("LSPBody-Bold", 8.4)
        canvas.drawCentredString(x + width / 2, y + height - 6 * mm, title)
        canvas.setFillColor(HexColor("#CBE1EA") if accent else SLATE)
        canvas.setFont("LSPBody", 6.8)
        canvas.drawCentredString(x + width / 2, y + 4 * mm, detail)

    def draw(self) -> None:
        canvas = self.canv
        top_y = 53 * mm
        box_w = 38 * mm
        box_h = 16 * mm
        boxes = [
            (0, "USER", "Authorized input"),
            (45 * mm, "REACT UI", "Console + findings"),
            (90 * mm, "FASTAPI", "Validated REST API"),
            (135 * mm, "SCAN SERVICE", "Safe orchestration"),
        ]
        for index, (x, title, detail) in enumerate(boxes):
            self.draw_box(x, top_y, box_w, box_h, title, detail, accent=index in {0, 3})
            if index < len(boxes) - 1:
                canvas.setStrokeColor(TEAL)
                canvas.setLineWidth(1.2)
                canvas.line(x + box_w + 2 * mm, top_y + box_h / 2, x + 43 * mm, top_y + box_h / 2)

        engine_y = 24 * mm
        engine_w = 31 * mm
        engine_gap = 4.5 * mm
        engines = [
            ("ASSESSMENT", "HTTP/DNS/TLS"),
            ("DETECTION", "Rules + evidence"),
            ("RISK", "Severity + confidence"),
            ("EDUCATION", "Learning + fixes"),
            ("DATA", "Database + cache"),
        ]
        for index, (title, detail) in enumerate(engines):
            x = index * (engine_w + engine_gap)
            self.draw_box(x, engine_y, engine_w, 15 * mm, title, detail)

        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(1)
        hub_x = 154 * mm
        canvas.line(hub_x, top_y, hub_x, 44 * mm)
        canvas.line(15 * mm, 44 * mm, hub_x, 44 * mm)
        for index in range(5):
            child_x = index * (engine_w + engine_gap) + engine_w / 2
            canvas.line(child_x, 44 * mm, child_x, 39 * mm)

        canvas.setFillColor(PALE_TEAL)
        canvas.roundRect(20 * mm, 1 * mm, 134 * mm, 14 * mm, 3 * mm, fill=1, stroke=0)
        canvas.setFillColor(TEAL_DARK)
        canvas.setFont("LSPBody-Bold", 8.5)
        canvas.drawCentredString(87 * mm, 9 * mm, "STRUCTURED FINDINGS -> GROUPED DASHBOARD -> ACTIONABLE ROADMAP")
        canvas.setFont("LSPBody", 6.8)
        canvas.drawCentredString(87 * mm, 5 * mm, "Exact evidence, risk context, remediation and official references")


class JuryDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=22 * mm,
            bottomMargin=18 * mm,
            title="LeakShield Pro - Complete Jury Documentation",
            author="LeakShield Pro",
            subject="Professional cybersecurity platform documentation",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="main",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(PageTemplate(id="jury", frames=frame, onPage=draw_report_page))
        self._heading_counter = 0

    def beforeDocument(self) -> None:
        # multiBuild performs several pagination passes; bookmark IDs must stay stable.
        self._heading_counter = 0

    def afterFlowable(self, flowable: Flowable) -> None:
        if isinstance(flowable, Paragraph) and flowable.style.name == "Heading1":
            self._heading_counter += 1
            key = f"section-{self._heading_counter}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(flowable.getPlainText(), key, level=0, closed=False)
            self.notify("TOCEntry", (0, flowable.getPlainText(), self.page, key))


def draw_shield(canvas, x: float, y: float, size: float) -> None:
    canvas.saveState()
    canvas.setStrokeColor(TEAL)
    canvas.setLineWidth(2)
    canvas.setFillColor(HexColor("#0C2A3D"))
    path = canvas.beginPath()
    path.moveTo(x, y + size)
    path.lineTo(x + size * 0.42, y + size * 0.84)
    path.lineTo(x + size * 0.84, y + size)
    path.lineTo(x + size * 0.78, y + size * 0.43)
    path.curveTo(x + size * 0.72, y + size * 0.18, x + size * 0.53, y + size * 0.06, x + size * 0.42, y)
    path.curveTo(x + size * 0.31, y + size * 0.06, x + size * 0.12, y + size * 0.18, x + size * 0.06, y + size * 0.43)
    path.close()
    canvas.drawPath(path, fill=1, stroke=1)
    canvas.setStrokeColor(CYAN)
    canvas.setLineWidth(2.4)
    canvas.line(x + size * 0.25, y + size * 0.51, x + size * 0.38, y + size * 0.38)
    canvas.line(x + size * 0.38, y + size * 0.38, x + size * 0.62, y + size * 0.68)
    canvas.restoreState()


def draw_report_page(canvas, doc) -> None:
    page = canvas.getPageNumber()
    canvas.saveState()
    if page == 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
        canvas.setFillColor(NAVY_2)
        canvas.circle(PAGE_WIDTH - 5 * mm, PAGE_HEIGHT - 18 * mm, 64 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(HexColor("#154159"))
        canvas.setLineWidth(0.6)
        for radius in (24, 34, 44, 54):
            canvas.circle(PAGE_WIDTH - 26 * mm, PAGE_HEIGHT - 42 * mm, radius * mm, fill=0, stroke=1)
        draw_shield(canvas, PAGE_WIDTH - 60 * mm, PAGE_HEIGHT - 72 * mm, 28 * mm)
        canvas.setFillColor(TEAL)
        canvas.rect(0, 0, PAGE_WIDTH, 5 * mm, fill=1, stroke=0)
    else:
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.rect(0, PAGE_HEIGHT - 14 * mm, PAGE_WIDTH, 14 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.6)
        canvas.line(18 * mm, PAGE_HEIGHT - 14 * mm, PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 14 * mm)
        canvas.setFont("LSPBody-Bold", 7.5)
        canvas.setFillColor(NAVY)
        canvas.drawString(18 * mm, PAGE_HEIGHT - 9.5 * mm, "LEAK SHIELD PRO")
        canvas.setFont("LSPBody", 7.2)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 9.5 * mm, "PROFESSIONAL JURY DOCUMENTATION")
        canvas.setStrokeColor(BORDER)
        canvas.line(18 * mm, 12 * mm, PAGE_WIDTH - 18 * mm, 12 * mm)
        canvas.setFont("LSPBody", 7.2)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, 7.5 * mm, "leak-shield-pro-2-0.vercel.app")
        canvas.drawRightString(PAGE_WIDTH - 18 * mm, 7.5 * mm, f"PAGE {page - 1:02d}")
        canvas.setFillColor(TEAL)
        canvas.rect(0, PAGE_HEIGHT - 3 * mm, PAGE_WIDTH, 3 * mm, fill=1, stroke=0)
    canvas.restoreState()


def p(text: str, style: str = "body") -> Paragraph:
    return Paragraph(text, STYLES[style])


def h1(text: str) -> Paragraph:
    return Paragraph(text, STYLES["h1"])


def h2(text: str) -> Paragraph:
    return Paragraph(text, STYLES["h2"])


def bullet(text: str) -> Paragraph:
    return Paragraph(f"<font color='#17B8A6'><b>+</b></font>&nbsp;&nbsp;{text}", STYLES["bullet"])


def numbered(number: int, text: str) -> Paragraph:
    return Paragraph(f"<font color='#0D776F'><b>{number:02d}</b></font>&nbsp;&nbsp;{text}", STYLES["number"])


def card(title: str, body: str, fill=WHITE, accent=TEAL) -> Table:
    content = [[Paragraph(title, STYLES["card_title"])], [Paragraph(body, STYLES["card_body"])]]
    table = Table(content, colWidths=[82 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
                ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
                ("TOPPADDING", (0, 1), (-1, 1), 1),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 9),
            ]
        )
    )
    return table


def card_grid(items: list[tuple[str, str]], fills: list | None = None) -> Table:
    rows = []
    for index in range(0, len(items), 2):
        row = []
        for offset in range(2):
            item_index = index + offset
            if item_index < len(items):
                title, body = items[item_index]
                fill = fills[item_index] if fills else WHITE
                row.append(card(title, body, fill=fill))
            else:
                row.append(Spacer(82 * mm, 1))
        rows.append(row)
    table = Table(rows, colWidths=[85 * mm, 85 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return table


def data_table(headers: list[str], rows: list[list[str]], widths: list[float]) -> Table:
    data = [[Paragraph(value, STYLES["table_header"]) for value in headers]]
    for row in rows:
        data.append(
            [
                Paragraph(value, STYLES["table_cell_bold"] if column == 0 else STYLES["table_cell"])
                for column, value in enumerate(row)
            ]
        )
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    for row_index in range(1, len(data)):
        commands.append(("BACKGROUND", (0, row_index), (-1, row_index), WHITE if row_index % 2 else PALE_BLUE))
    table.setStyle(TableStyle(commands))
    return table


def callout(title: str, body: str, tone: str = "teal") -> Table:
    palette = {
        "teal": (PALE_TEAL, TEAL, TEAL_DARK),
        "gold": (PALE_GOLD, GOLD, HexColor("#75540A")),
        "red": (PALE_RED, RED, RED),
        "blue": (PALE_BLUE, CYAN, NAVY),
    }
    fill, accent, title_color = palette[tone]
    title_style = ParagraphStyle("CalloutTitle", parent=STYLES["card_title"], textColor=title_color)
    content = [[Paragraph(title, title_style)], [Paragraph(body, STYLES["callout"])]]
    table = Table(content, colWidths=[170 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.5, accent),
                ("LINEBEFORE", (0, 0), (0, -1), 4, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
                ("TOPPADDING", (0, 1), (-1, 1), 1),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 9),
            ]
        )
    )
    return table


def section_break(label: str, title: str, intro: str | None = None) -> list[Flowable]:
    items: list[Flowable] = [SectionLabel(label), Spacer(1, 4 * mm), h1(title)]
    if intro:
        items.append(p(intro, "lead"))
    return items


def page() -> PageBreak:
    return PageBreak()


def build_report_story() -> list[Flowable]:
    story: list[Flowable] = []

    # Cover
    story.extend(
        [
            Spacer(1, 55 * mm),
            p("INTERNATIONAL EXHIBITION | PROFESSIONAL JURY SUBMISSION", "cover_kicker"),
            p("LeakShield Pro", "cover_title"),
            p("Complete Product, Architecture and Security Documentation", "cover_subtitle"),
            HRFlowable(width=78 * mm, thickness=2, color=TEAL, spaceBefore=1, spaceAfter=8 * mm, hAlign="LEFT"),
            p("A free and open-source cybersecurity assessment platform that discovers public security risks, presents exact evidence, teaches secure development, and guides remediation.", "cover_meta"),
            Spacer(1, 22 * mm),
            Table(
                [
                    [p("DOCUMENT", "cover_kicker"), p("PLATFORM", "cover_kicker"), p("STATUS", "cover_kicker")],
                    [p("Jury Edition 2026", "cover_meta"), p("Web + Code Security", "cover_meta"), p("Production Ready", "cover_meta")],
                ],
                colWidths=[54 * mm, 54 * mm, 54 * mm],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#0B2638")),
                        ("BOX", (0, 0), (-1, -1), 0.6, HexColor("#1C485D")),
                        ("INNERGRID", (0, 0), (-1, -1), 0.4, HexColor("#1C485D")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 9),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ]
                ),
            ),
            Spacer(1, 28 * mm),
            p("Enterprise-quality cybersecurity for everyone, completely free.", "cover_kicker"),
            p("Live: leak-shield-pro-2-0.vercel.app<br/>Repository: github.com/shaheerali4/leak-sheild-pro-2-0<br/>Prepared: 22 August 2026", "cover_meta"),
            page(),
        ]
    )

    # Document control and TOC
    story.extend(section_break("Document control", "About This Report", "A current, jury-ready explanation of what LeakShield Pro does, why it exists, how it works, how it stays safe, and where it can grow."))
    story.append(
        data_table(
            ["Item", "Detail"],
            [
                ["Project", "LeakShield Pro"],
                ["Category", "Cybersecurity, DevSecOps and secure software education"],
                ["Primary users", "Developers, students, startups, educators and small businesses"],
                ["Assessment scope", "Authorized public websites, pasted text, configuration, CI logs and project folders"],
                ["Deployment", "Vercel production deployment and Docker/local development"],
                ["Commercial dependency", "None required. Core operation uses free and public technology."],
                ["Safety position", "Defensive, bounded and low-impact. No credential guessing or exploit execution."],
            ],
            [43 * mm, 127 * mm],
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(callout("How to use this report", "Read the Executive Summary for the project pitch, the Workflow and Architecture sections for technical understanding, the Security Model for trust and safety, and the Exhibition Runbook for the live jury demonstration.", "blue"))
    story.append(page())
    story.append(Paragraph("Contents", STYLES["toc_title"]))
    toc = TableOfContents()
    toc.levelStyles = [STYLES["toc_level_0"]]
    toc.dotsMinLevel = 0
    story.append(toc)
    story.append(page())

    # Executive summary
    story.extend(section_break("01 | Executive summary", "Security Evidence That Developers Can Act On", "LeakShield Pro transforms raw public website and code signals into clear, defensible and educational security findings."))
    story.append(
        card_grid(
            [
                ("DISCOVER", "Find public attack-surface routes, configuration weaknesses, exposed files, technology signals and potential secrets."),
                ("PROVE", "Show the exact URL, file, line, column, header, cookie or component supporting each result."),
                ("PRIORITIZE", "Combine severity, confidence, evidence quality and public exposure into understandable risk."),
                ("REMEDIATE", "Explain business impact and provide step-by-step fixes with trusted official references."),
            ],
            [PALE_TEAL, PALE_BLUE, PALE_GOLD, WHITE],
        )
    )
    story.append(h2("The core problem"))
    story.append(p("Professional security tools can be expensive, traditional reports are difficult for beginners, and vague warnings do not help a developer prove or repair the root cause. LeakShield Pro addresses all three gaps in one free platform."))
    story.append(h2("The project outcome"))
    story.append(p("A user can submit an authorized public URL, paste security-relevant text, or provide a project folder. The platform validates the input, performs bounded assessment phases, produces grouped findings, and connects every useful result to evidence, explanation and remediation."))
    story.append(callout("Jury value proposition", "This is not a page that displays random warnings. It is an end-to-end security workflow: acquisition, validation, evidence collection, deduplication, risk scoring, education, remediation, session-scoped history, reporting, testing and free deployment.", "teal"))
    story.append(page())

    # Problem and principles
    story.extend(section_break("02 | Purpose", "Problem Statement, Audience and Principles", "The platform is built around practical security access: accurate enough to be trusted, understandable enough to teach, and free enough to reach everyone."))
    story.append(h2("Who benefits"))
    story.append(card_grid([
        ("Developers", "Check public deployment posture and receive implementation-focused fixes."),
        ("Students", "Learn why a weakness matters and how secure design prevents it."),
        ("Startups", "Receive an initial security roadmap without a mandatory commercial scanner."),
        ("Educators and teams", "Demonstrate responsible assessment and evidence-based reporting."),
    ]))
    story.append(h2("Product principles"))
    for item in [
        "Evidence before claims - every useful result should identify what was observed and where.",
        "Safe by design - public targets only, bounded requests, redirect revalidation and no exploit payloads.",
        "Education with action - explain the weakness and connect it to a practical fix.",
        "Free core operation - no mandatory Shodan, paid AI model, paid API or commercial subscription.",
        "Transparent limitations - distinguish confirmed evidence, potential indicators and authorization-required tests.",
        "Production engineering - typed data, modular engines, automated testing, secure configuration and maintainable code.",
    ]:
        story.append(bullet(item))
    story.append(page())

    # Workflow
    story.extend(section_break("03 | Workflow", "Complete Start-to-End User Journey", "From the shield unlock to remediation, each stage has one clear purpose."))
    story.append(ProcessFlow(["OPEN\nCONSOLE", "SELECT\nINPUT", "VALIDATE\nTARGET", "RUN SAFE\nCHECKS", "GROUP\nEVIDENCE", "FIX +\nLEARN"]))
    story.append(h2("Detailed sequence"))
    steps = [
        "The shield unlock animation introduces the security console and loads the main application.",
        "The user opens Scan and selects website, text or project-folder mode.",
        "The backend validates type, size, public address, ownership header and safety limits.",
        "Assessment engines collect HTTP, DNS, TLS, JavaScript, configuration and code evidence as applicable.",
        "Detection rules normalize, deduplicate and redact potentially sensitive results.",
        "The risk engine calculates severity, confidence and contextual priority.",
        "The Findings interface groups related results and exposes exact evidence only when opened.",
        "Learning Mode, framework fixes, roadmap and report export guide the remediation process.",
        "Mission Archive stores session-owned history that the user can reopen or clear.",
    ]
    for index, item in enumerate(steps, start=1):
        story.append(numbered(index, item))
    story.append(callout("Important boundary", "Finding a route, technology or form does not automatically mean it is vulnerable. LeakShield labels discovery information separately from direct evidence and from checks that require explicit authorization.", "gold"))
    story.append(page())

    # Assessment capabilities
    story.extend(section_break("04 | Capabilities", "Website and Code Assessment Coverage", "LeakShield combines multiple free signals while keeping every operation bounded and defensible."))
    capability_rows = [
        ["Discovery", "Same-origin pages, robots.txt, sitemap.xml, common routes and JavaScript links", "Attack-surface inventory"],
        ["Headers", "CSP, HSTS, framing, MIME, referrer, permissions and browser isolation", "Observed response configuration"],
        ["TLS", "Certificate hostname, issuer, expiry, protocol and cipher", "Negotiated public TLS evidence"],
        ["DNS", "A/AAAA, MX, TXT, SPF, DMARC, DKIM, CAA, NS, CNAME and DNSSEC", "Public DNS records"],
        ["Subdomains", "Certificate Transparency plus DNS resolution and HTTP reachability", "Free public CT and network signals"],
        ["Technology", "Headers, HTML, scripts, cookies and product/version fingerprints", "Wappalyzer-style evidence"],
        ["Exposure", "Git, env, backup, SQL, archive, config, debug and directory-index signals", "Public response verification"],
        ["Secrets", "Cloud keys, API keys, tokens, JWTs, private keys and connection strings", "Redacted exact location"],
        ["Web indicators", "Forms, CSRF visibility, uploads, CORS, cookies, redirects, SQL errors and DOM-XSS signals", "Passive or low-impact evidence"],
        ["CVE", "Exact product and version correlation through NIST NVD", "Known-vulnerability intelligence"],
        ["Network", "Small bounded common-port checks and RDAP ownership", "Public service context"],
    ]
    story.append(data_table(["Module", "What is checked", "Evidence type"], capability_rows, [29 * mm, 90 * mm, 51 * mm]))
    story.append(page())

    # Evidence model
    story.extend(section_break("05 | Accuracy", "Exact Evidence and Verification Model", "Professional security output must explain what happened, where it happened, what proves it, and how to fix it."))
    story.append(card_grid([
        ("WHAT", "The vulnerability or security condition identified by the rule."),
        ("WHERE", "Exact URL, file, line, column, header, cookie or affected component."),
        ("PROOF", "Observed redacted evidence, expected secure state and detection method."),
        ("ACTION", "Business impact, remediation, framework guidance and trusted references."),
    ], [PALE_BLUE, PALE_TEAL, PALE_GOLD, WHITE]))
    story.append(h2("Verification states"))
    story.append(data_table(
        ["State", "Meaning", "How the user should respond"],
        [
            ["Confirmed", "Direct public evidence supports the result.", "Prioritize according to severity and remediate."],
            ["Potential", "A relevant pattern exists but requires human verification.", "Inspect context before treating it as a proven vulnerability."],
            ["Informational", "Useful surface or configuration information, not a proven flaw.", "Use it to understand exposure and plan hardening."],
            ["Authorization required", "Active confirmation would require permission and is not attempted.", "Use a separate controlled assessment after written authorization."],
        ],
        [35 * mm, 72 * mm, 63 * mm],
    ))
    story.append(h2("Secret evidence without spreading the secret"))
    story.append(p("A potential key can be shown as a short redacted preview such as <font name='LSPMono'>AIza...50Us</font>, together with the exact public resource and line/column location. The complete credential is not repeated in the dashboard, report or audit record."))
    story.append(callout("Why this matters", "Severity and confidence are different. A potentially critical impact does not become confirmed evidence merely because the possible damage is high.", "red"))
    story.append(page())

    # Architecture
    story.extend(section_break("06 | Architecture", "Clean, Modular and Deployment-Friendly Design", "The system separates user experience, request validation, assessment, risk, education and persistence so each part can evolve safely."))
    story.append(ArchitectureDiagram())
    story.append(h2("Layer responsibilities"))
    story.append(data_table(
        ["Layer", "Responsibility"],
        [
            ["React dashboard", "Input modes, progress, grouped findings, evidence inspection, themes, history and reports."],
            ["FastAPI routes", "Typed validation, ownership controls, rate limits and stable JSON endpoints."],
            ["Scan Service", "Coordinates safety checks, assessment engines, risk, explanation, cache and persistence."],
            ["Assessment engines", "Collect bounded website, network, DNS, TLS, technology and exposure signals."],
            ["Detection engine", "Runs rule modules, maps exact locations, deduplicates and redacts values."],
            ["Risk and education", "Prioritizes evidence and produces understandable impact, remediation and Learning Mode content."],
            ["Data layer", "Stores scans/findings in PostgreSQL or local SQLite and optionally caches repeated work in Redis."],
        ],
        [42 * mm, 128 * mm],
    ))
    story.append(page())

    # UI
    story.extend(section_break("07 | Experience", "Focused Interface for Scanning and Findings", "The interface keeps the dramatic shield opening, then shifts to a clean professional workspace designed for quick decisions."))
    story.append(card_grid([
        ("SHIELD INTRO", "A branded unlock sequence creates a memorable security identity without changing scan logic."),
        ("CONSOLE", "The overview presents the latest grade, score, important metrics and primary action."),
        ("SCAN", "Threat acquisition accepts authorized inputs and Mission Archive manages session history."),
        ("FINDINGS", "Related results are grouped under expandable sections with an exact evidence inspector."),
    ], [PALE_TEAL, WHITE, PALE_BLUE, WHITE]))
    story.append(h2("Supporting information without page overload"))
    story.append(p("Attack surface, CVE intelligence, report export and the security field guide live inside collapsible drawers under Findings. This keeps the main navigation limited to Scan and Findings while preserving important capabilities."))
    story.append(h2("Accessibility and compatibility"))
    for item in [
        "Responsive layouts for desktop, tablet and mobile devices.",
        "Professionally designed dark and light themes.",
        "Keyboard-friendly controls and visible interaction states.",
        "Expandable sections that open independently without stretching empty neighboring cards.",
        "Compact grouping that prevents long, unprofessional result walls.",
    ]:
        story.append(bullet(item))
    story.append(page())

    # Risk, education, roadmap
    story.extend(section_break("08 | Intelligence", "Risk Scoring, Learning Mode and Fix Guidance", "The platform moves from detection to decision support by explaining both urgency and implementation."))
    story.append(h2("Risk model"))
    story.append(p("The risk engine combines rule severity, confidence, evidence quality, public exposure and contextual signals into a 0-100 score and grade. Findings remain transparent about uncertainty instead of converting weak evidence into absolute claims."))
    story.append(h2("Learning Mode"))
    for item in [
        "Definition and beginner-friendly explanation",
        "Why the issue is dangerous and its business impact",
        "Generalized attacker behavior without exploit instructions",
        "Common developer mistakes and secure coding recommendations",
        "Step-by-step remediation and prevention checklist",
        "OWASP, MDN, RFC, MITRE, NIST or official vendor references",
    ]:
        story.append(bullet(item))
    story.append(h2("Developer Fix Assistant"))
    story.append(p("When relevant, findings can include safe configuration or coding recommendations for Apache, Nginx, Express.js, Next.js, React, Laravel, Node.js, Spring Boot and generic frameworks. Exploit code is intentionally excluded."))
    story.append(h2("Improvement roadmap"))
    story.append(data_table(
        ["Priority", "Typical meaning", "Planning output"],
        [
            ["Priority 1", "Critical exposure with strong evidence", "Immediate containment, rotation or access restriction"],
            ["Priority 2", "High-risk weakness", "Near-term engineering fix and verification"],
            ["Priority 3", "Medium-risk hardening", "Scheduled remediation with owner and effort"],
            ["Priority 4", "Low or informational improvement", "Backlog hardening and monitoring"],
        ],
        [33 * mm, 68 * mm, 69 * mm],
    ))
    story.append(page())

    # Security model
    story.extend(section_break("09 | Trust", "Platform Security, Privacy and Safe-Scanning Controls", "A cybersecurity platform must protect both its users and the systems it assesses."))
    story.append(card_grid([
        ("SSRF DEFENSE", "Blocks loopback, private, reserved and local addresses before requests and after redirects."),
        ("BOUNDED WORK", "Limits file size, project size, response size, crawl breadth, ports and execution time."),
        ("SESSION ISOLATION", "Hashes a random browser session identifier and scopes list, detail and delete operations to its owner."),
        ("SECRET REDACTION", "Stores and displays hashes, previews and safe context rather than full credential values."),
    ], [PALE_RED, PALE_GOLD, PALE_TEAL, PALE_BLUE]))
    story.append(h2("Additional controls"))
    for item in [
        "Typed Pydantic input and response validation.",
        "Rate limiting on important public and admin routes.",
        "CORS and trusted-host configuration.",
        "Signed admin sessions with environment-based account allowlisting.",
        "No password guessing, exploit submission, authorization bypass or dangerous file upload.",
        "No real credentials stored in source code or project documentation.",
    ]:
        story.append(bullet(item))
    story.append(callout("Admin access", "The admin portal is intentionally absent from normal navigation and is opened through /admin=true. Real accounts and the session-signing secret belong only in protected deployment environment variables.", "blue"))
    story.append(page())

    # Free sources
    story.extend(section_break("10 | Open source", "Free Data Sources and No Mandatory Paid Services", "The project philosophy is practical: enterprise-quality security assistance should remain available without a commercial dependency."))
    story.append(h2("What the platform uses"))
    source_rows = [
        ["Direct HTTP/HTTPS", "Response status, headers, HTML, scripts, cookies and public files"],
        ["DNS", "Public host, mail and domain-security records"],
        ["TLS", "Certificate and negotiated encryption information"],
        ["crt.sh", "Free public Certificate Transparency subdomain data"],
        ["RDAP", "Free public network ownership and registration context"],
        ["NIST NVD", "Free exact-version known-vulnerability correlation"],
        ["Local rules", "Deterministic detection, scoring, explanation and education"],
    ]
    story.append(data_table(["Source", "Purpose"], source_rows, [43 * mm, 127 * mm]))
    story.append(h2("What the platform does not require"))
    story.append(card_grid([
        ("NO SHODAN", "LeakShield Pro does not use a Shodan API key for its assessment workflow."),
        ("NO PAID AI", "Core advisor and education content works through local deterministic rules."),
        ("NO PREMIUM DATABASE", "PostgreSQL, SQLite and Redis are open technologies with free deployment options."),
        ("NO COMMERCIAL SCANNER", "The core platform remains functional without a mandatory proprietary service."),
    ], [PALE_TEAL, PALE_BLUE, WHITE, PALE_GOLD]))
    story.append(page())

    # Tech stack and structure
    story.extend(section_break("11 | Engineering", "Technology Stack and Codebase Map", "The stack is intentionally modern, typed where practical, modular and suitable for free hosting."))
    story.append(data_table(
        ["Area", "Technology", "Purpose"],
        [
            ["Frontend", "React 18, Vite, Tailwind/project CSS, Lucide", "Responsive dashboard, themes, components and production bundle"],
            ["Backend", "Python 3.11, FastAPI, Pydantic", "Async API, input validation and OpenAPI documentation"],
            ["Assessment", "HTTPX, dnspython, TLS sockets, local rules", "Bounded public signal collection and analysis"],
            ["Database", "SQLAlchemy Async, PostgreSQL, SQLite", "Durable production records and local fallback"],
            ["Cache", "Redis", "Optional repeated-result acceleration"],
            ["Deployment", "Vercel, Docker Compose", "Public production hosting and reproducible local stack"],
            ["Quality", "Pytest, Ruff, Bandit, pip-audit, npm audit", "Behavior, style, security and dependency verification"],
        ],
        [30 * mm, 60 * mm, 80 * mm],
    ))
    story.append(h2("Repository map"))
    structure = [
        ["backend/app/api", "Scan and admin HTTP routes"],
        ["backend/app/engines", "Website assessment, detection, risk and education"],
        ["backend/app/services", "Complete scan orchestration"],
        ["backend/tests", "Backend behavior and security tests"],
        ["frontend/src/components", "Console, scanner, findings, admin, knowledge and shield UI"],
        ["frontend/src/data", "Knowledge-base content"],
        ["docs", "Architecture, audit, report and user documentation"],
        ["scripts", "Reproducible report and project utilities"],
        [".github/workflows", "Automated security and quality pipeline"],
        ["vercel.json / docker-compose.yml", "Production and local deployment configuration"],
    ]
    story.append(data_table(["Path", "Responsibility"], structure, [63 * mm, 107 * mm]))
    story.append(page())

    # APIs and deployment
    story.extend(section_break("12 | Operations", "API, Configuration and Deployment Workflow", "The same shared FastAPI implementation supports local Docker and the Vercel production workflow."))
    story.append(h2("Primary API endpoints"))
    story.append(data_table(
        ["Method", "Endpoint", "Purpose"],
        [
            ["GET", "/api/health", "Confirm service availability"],
            ["POST", "/api/scans", "Start a website, text or project-folder scan"],
            ["GET", "/api/scans", "List scans owned by the current session"],
            ["GET", "/api/scans/{id}", "Load one owned scan and its findings"],
            ["DELETE", "/api/scans", "Clear the current session's scan history"],
            ["POST", "/api/admin", "Authenticate an allowed administrator"],
            ["GET / DELETE", "/api/admin", "Read or clear protected admin audit information"],
        ],
        [26 * mm, 55 * mm, 89 * mm],
    ))
    story.append(h2("Important environment settings"))
    story.append(p("Production configuration includes <font name='LSPMono'>DATABASE_URL</font>, <font name='LSPMono'>REDIS_URL</font>, <font name='LSPMono'>CORS_ORIGINS</font>, <font name='LSPMono'>ALLOWED_HOSTS</font>, <font name='LSPMono'>ADMIN_ACCOUNTS_JSON</font> and <font name='LSPMono'>ADMIN_SESSION_SECRET</font>. Real values must never be committed."))
    story.append(h2("Deployment sequence"))
    for index, item in enumerate([
        "Implement the change locally on a feature branch.",
        "Run backend, frontend, dependency and security checks.",
        "Commit only intended files and push to GitHub.",
        "Merge the verified commit into main.",
        "Vercel builds the connected repository and publishes the update.",
        "Verify the live browser workflow and production API response.",
    ], start=1):
        story.append(numbered(index, item))
    story.append(page())

    # Quality
    story.extend(section_break("13 | Assurance", "Testing, Review and Production Quality", "Security features are supported by automated checks rather than visual claims alone."))
    story.append(card_grid([
        ("BACKEND TESTS", "Pytest covers services, routes, rules, ownership, validation and security behavior."),
        ("STATIC QUALITY", "Ruff and Bandit identify Python correctness, style and insecure coding patterns."),
        ("DEPENDENCIES", "pip-audit and npm audit check known package vulnerabilities."),
        ("FRONTEND BUILD", "Vite production build confirms that the deployed interface compiles successfully."),
    ], [PALE_BLUE, PALE_TEAL, PALE_GOLD, WHITE]))
    story.append(h2("Automated GitHub pipeline"))
    for item in [
        "Root Node API compatibility tests",
        "Frontend dependency audit and production build",
        "Python Ruff linting and Bandit security analysis",
        "Python dependency audit and package consistency check",
        "Complete backend Pytest suite",
    ]:
        story.append(bullet(item))
    story.append(callout("Quality rule", "Warnings are investigated instead of silently suppressed. Security fixes target root causes and preserve existing behavior whenever possible.", "teal"))
    story.append(page())

    # Demo
    story.extend(section_break("14 | Exhibition", "Professional Jury Demonstration Runbook", "A short, evidence-focused demonstration communicates more value than opening every module."))
    demo_rows = [
        ["00:00-00:15", "Launch", "Show the shield unlock and name the platform."],
        ["00:15-00:35", "Problem", "Explain that developers need affordable and understandable security evidence."],
        ["00:35-01:10", "Scan", "Enter a team-owned or authorized URL and start the assessment."],
        ["01:10-01:40", "Evidence", "Open one grouped finding and point to URL, proof, confidence and verification state."],
        ["01:40-02:05", "Remediation", "Show Learning Mode, framework guidance and improvement roadmap."],
        ["02:05-02:25", "Trust", "State: passive checks, no Shodan, no paid API, secrets redacted."],
        ["02:25-02:45", "Close", "Show report/export and present the future scope."],
    ]
    story.append(data_table(["Time", "Scene", "Jury message"], demo_rows, [31 * mm, 31 * mm, 108 * mm]))
    story.append(h2("Best demonstration target"))
    story.append(p("Use a deliberately vulnerable local lab, a project-owned website, or a target with explicit written authorization. Never expose a real API key, admin password or private customer website during recording or exhibition."))
    story.append(h2("Strong jury proof points"))
    for item in [
        "The finding includes exact evidence instead of only a vulnerability name.",
        "The platform separates confirmed, potential, informational and authorization-required results.",
        "Sensitive values are redacted while their public location remains provable.",
        "The same result includes business impact, secure fix and learning material.",
        "The project remains functional without Shodan or a paid AI model.",
    ]:
        story.append(bullet(item))
    story.append(page())

    # Limitations and roadmap
    story.extend(section_break("15 | Roadmap", "Transparent Limitations and Future Scope", "Trust grows when a platform clearly states what it can prove today and what belongs in a future authorized testing environment."))
    story.append(h2("Current limitations"))
    limitations = [
        "The Vercel runtime cannot execute every large native cybersecurity binary.",
        "Public website assessment is intentionally bounded to protect targets and hosting resources.",
        "Passive evidence cannot confirm every SQL injection, XSS, authentication, authorization, upload or business-logic flaw.",
        "External DNS, TLS, Certificate Transparency and NVD services can be temporarily unavailable.",
        "Technology versions can be hidden by proxies, CDNs or custom headers.",
        "Secret-pattern results can include intentionally public identifiers and require human verification.",
        "Session history is not yet a complete multi-user workspace and role system.",
    ]
    for item in limitations:
        story.append(bullet(item))
    story.append(h2("Future roadmap"))
    roadmap = [
        ["Near term", "Target ownership proof, improved comparisons, notifications and expanded framework guidance"],
        ["Team edition", "User accounts, shared workspaces, role-based access and signed report verification"],
        ["Developer workflow", "GitHub pull-request checks, CI/CD integration and scheduled monitoring"],
        ["Self-hosted lab", "Optional Katana, Subfinder, Nuclei and OWASP ZAP adapters in isolated containers"],
        ["Advanced coverage", "Authenticated assessment, API/GraphQL modules and controlled dynamic analysis"],
        ["Education", "Multilingual learning content and community-contributed rules"],
    ]
    story.append(data_table(["Horizon", "Planned direction"], roadmap, [39 * mm, 131 * mm]))
    story.append(page())

    # Glossary and jury Q&A
    story.extend(section_break("16 | Reference", "Simple Technical Glossary", "Plain-language definitions help technical and non-technical jury members understand the same project."))
    glossary = [
        ["API", "A controlled way for two software systems to communicate."],
        ["Attack surface", "All public routes, services and components that may be reached."],
        ["CORS", "Browser rules controlling which other websites can read a response."],
        ["CSP", "Browser rules controlling which scripts and resources may load."],
        ["CVE", "A public identifier for a known software vulnerability."],
        ["CWE", "A category describing a type of software weakness."],
        ["Evidence", "The exact observed information supporting a finding."],
        ["False positive", "A warning that appears dangerous but is not a valid issue."],
        ["Remediation", "The practical steps used to fix a security weakness."],
        ["Risk severity", "How much damage a valid issue could cause."],
        ["Confidence", "How strongly the available evidence supports the result."],
        ["SSRF", "A weakness that tricks a server into requesting a protected address."],
        ["TLS/SSL", "The encryption that protects HTTPS traffic."],
        ["Redaction", "Hiding the sensitive middle of a secret value."],
    ]
    story.append(data_table(["Term", "Easy meaning"], glossary, [42 * mm, 128 * mm]))
    story.append(page())

    story.extend(section_break("17 | Jury defense", "Questions the Team Should Be Ready to Answer", "Short, accurate answers demonstrate technical maturity and responsible security engineering."))
    qa = [
        ("Is every finding a confirmed vulnerability?", "No. The platform labels confirmed evidence, potential indicators, informational surface and authorization-required checks separately."),
        ("Does it attack the website?", "No. Core website assessment is passive or low-impact and does not submit exploit payloads, guess credentials or bypass access control."),
        ("How do you prove a result?", "The finding includes the exact resource, line or component, redacted evidence, expected state, method and verification status."),
        ("Does it use Shodan or paid AI?", "No. Core operation uses free public HTTP, DNS, TLS, crt.sh, RDAP, NIST NVD and local deterministic rules."),
        ("Why call it AI-powered?", "Its advisor converts structured evidence into context-aware summaries, priorities and education. The core remains deterministic and does not depend on a paid LLM."),
        ("How is the scanner itself secured?", "SSRF controls, redirect revalidation, strict limits, typed validation, rate limiting, session ownership, redaction and signed admin sessions."),
        ("What makes it different from a simple scanner?", "It combines discovery, proof, prioritization, learning, framework fixes, roadmap, history and reporting in one workflow."),
    ]
    for question, answer in qa:
        story.append(KeepTogether([p(question, "h3"), p(answer)]))
    story.append(page())

    # Closing
    story.extend(section_break("18 | Conclusion", "A Security Platform That Finds, Explains and Helps Fix", "LeakShield Pro is designed to make responsible cybersecurity evidence available to the people who need it most."))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Enterprise-quality cybersecurity<br/>for everyone, completely free.", STYLES["quote"]))
    story.append(Spacer(1, 12 * mm))
    story.append(HRFlowable(width=90 * mm, thickness=2, color=TEAL, hAlign="CENTER", spaceAfter=10 * mm))
    story.append(p("The project's value is not limited to detecting a technical pattern. It creates a full chain from authorized input to defensible evidence, risk understanding, secure remediation and long-term learning. That combination makes LeakShield Pro suitable for developers, classrooms, startups, small businesses and an international technology exhibition.", "lead"))
    story.append(Spacer(1, 8 * mm))
    story.append(callout("Live platform", "https://leak-shield-pro-2-0.vercel.app/", "teal"))
    story.append(Spacer(1, 3 * mm))
    story.append(callout("Open-source repository", "https://github.com/shaheerali4/leak-sheild-pro-2-0", "blue"))
    story.append(Spacer(1, 14 * mm))
    story.append(p("Prepared from the current LeakShield Pro implementation and complete project documentation. No real credentials are included in this report.", "body_small"))
    return story


def build_report() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = JuryDocTemplate(str(REPORT_PATH))
    doc.multiBuild(build_report_story())


def draw_script_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_HEIGHT - 63 * mm, PAGE_WIDTH, 63 * mm, fill=1, stroke=0)
    canvas.setFillColor(NAVY_2)
    canvas.circle(PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 18 * mm, 34 * mm, fill=1, stroke=0)
    draw_shield(canvas, PAGE_WIDTH - 46 * mm, PAGE_HEIGHT - 49 * mm, 21 * mm)
    canvas.setFillColor(TEAL)
    canvas.rect(0, 0, PAGE_WIDTH, 4 * mm, fill=1, stroke=0)
    canvas.setStrokeColor(BORDER)
    canvas.line(18 * mm, 12 * mm, PAGE_WIDTH - 18 * mm, 12 * mm)
    canvas.setFont("LSPBody", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 7.5 * mm, "LEAK SHIELD PRO | EXHIBITION RECORDING ASSET")
    canvas.drawRightString(PAGE_WIDTH - 18 * mm, 7.5 * mm, "60 SECONDS")
    canvas.restoreState()


def build_script_pdf() -> None:
    from reportlab.platypus import SimpleDocTemplate

    doc = SimpleDocTemplate(
        str(SCRIPT_PATH),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="LeakShield Pro - One-Minute Video Script",
        author="LeakShield Pro",
    )
    white_kicker = ParagraphStyle("ScriptKicker", parent=STYLES["cover_kicker"], textColor=CYAN)
    white_title = ParagraphStyle("ScriptTitle", parent=STYLES["cover_title"], fontSize=27, leading=31)
    white_sub = ParagraphStyle("ScriptSub", parent=STYLES["cover_meta"], fontSize=10, leading=13)
    script_style = ParagraphStyle(
        "ScriptBody",
        parent=STYLES["body"],
        fontSize=12.2,
        leading=18.5,
        textColor=NAVY,
        spaceAfter=0,
    )
    time_style = ParagraphStyle("Time", parent=STYLES["card_title"], fontSize=8.2, textColor=TEAL_DARK, alignment=TA_CENTER)
    scene_style = ParagraphStyle("Scene", parent=STYLES["card_body"], fontSize=7.7, leading=9.5, alignment=TA_CENTER)

    timeline = [
        ("0-6", "Shield + intro"),
        ("6-16", "Problem"),
        ("16-28", "Start scan"),
        ("28-43", "Evidence"),
        ("43-52", "Fix guide"),
        ("52-60", "Future + close"),
    ]
    timeline_table = Table(
        [[Paragraph(time, time_style) for time, _ in timeline], [Paragraph(scene, scene_style) for _, scene in timeline]],
        colWidths=[28.3 * mm] * 6,
    )
    timeline_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE_TEAL),
                ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )

    script = (
        "Assalam-o-Alaikum, this is <b>LeakShield Pro</b>, a completely free and open-source cybersecurity platform. "
        "Aaj security tools ko afford aur samajhna difficult hota hai, isi liye humne LeakShield Pro banaya. "
        "User apni authorized website URL, code, configuration, ya project folder provide karta hai. Platform security headers, SSL, DNS, technologies, exposed files aur potential secret leaks safely analyze karta hai. "
        "Har finding exact affected URL ya file location, redacted evidence, risk level, business impact aur step-by-step fix show karti hai, so developer ko problem ka reason aur solution dono samajh aate hain. "
        "Ye passive checks use karta hai, exploit attacks nahi karta, aur Shodan ya paid API require nahi karta. "
        "Future mein authenticated testing, team collaboration, GitHub integration aur continuous monitoring add ki jayegi. "
        "LeakShield Pro ka mission hai: <b>enterprise-quality cybersecurity, completely free for everyone.</b>"
    )

    script_box = Table([[Paragraph(script, script_style)]], colWidths=[166 * mm])
    script_box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                ("LINEBEFORE", (0, 0), (0, -1), 4, TEAL),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 13),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 13),
            ]
        )
    )

    note_rows = [
        ["PACE", "Speak clearly at a natural pace. The narration is 132 words."],
        ["PROOF", "Point at the exact affected URL and redacted evidence while describing findings."],
        ["SAFETY", "Use a team-owned target. Never expose a real API key or admin password."],
        ["ENDING", "Finish on the logo and hold the final mission statement for one second."],
    ]

    story = [
        Spacer(1, 4 * mm),
        Paragraph("ONE-MINUTE EXHIBITION VIDEO", white_kicker),
        Paragraph("LeakShield Pro", white_title),
        Paragraph("Roman Urdu + English | Exact narration and screen timing", white_sub),
        Spacer(1, 25 * mm),
        SectionLabel("Recording timeline"),
        Spacer(1, 3 * mm),
        timeline_table,
        Spacer(1, 7 * mm),
        SectionLabel("Exact spoken script"),
        Spacer(1, 3 * mm),
        script_box,
        Spacer(1, 7 * mm),
        SectionLabel("Delivery notes"),
        Spacer(1, 3 * mm),
        data_table(["Cue", "Direction"], note_rows, [28 * mm, 142 * mm]),
    ]
    doc.build(story, onFirstPage=draw_script_page)


def main() -> None:
    build_report()
    build_script_pdf()
    print(REPORT_PATH)
    print(SCRIPT_PATH)


if __name__ == "__main__":
    main()
