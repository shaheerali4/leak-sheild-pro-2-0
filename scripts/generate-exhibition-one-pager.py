"""Generate the print-ready LeakShield Pro A4 exhibition one-pager."""

from __future__ import annotations

from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "LeakShield-Pro-A4-Exhibition-One-Pager.pdf"
LIVE_URL = "https://leak-shield-pro-2-0.vercel.app/"
REPOSITORY_URL = "github.com/shaheerali4/leak-sheild-pro-2-0"

PAGE_WIDTH, PAGE_HEIGHT = A4

NAVY = HexColor("#061827")
NAVY_2 = HexColor("#0B2A3D")
INK = HexColor("#0D2235")
SLATE = HexColor("#496176")
MUTED = HexColor("#71869A")
TEAL = HexColor("#18B9A7")
TEAL_DARK = HexColor("#087970")
CYAN = HexColor("#50D5EC")
WHITE = HexColor("#FFFFFF")
PAPER = HexColor("#F5F9FC")
PALE_TEAL = HexColor("#E7F8F5")
PALE_BLUE = HexColor("#EBF4FA")
PALE_GOLD = HexColor("#FFF4D8")
BORDER = HexColor("#D5E2EA")


def register_fonts() -> None:
    fonts = {
        "LSPBody": Path("C:/Windows/Fonts/calibri.ttf"),
        "LSPBody-Bold": Path("C:/Windows/Fonts/calibrib.ttf"),
        "LSPDisplay": Path("C:/Windows/Fonts/segoeui.ttf"),
        "LSPDisplay-Bold": Path("C:/Windows/Fonts/segoeuib.ttf"),
        "LSPMono": Path("C:/Windows/Fonts/consola.ttf"),
    }
    for name, path in fonts.items():
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))


register_fonts()


BODY = ParagraphStyle(
    "Body",
    fontName="LSPBody",
    fontSize=9.4,
    leading=12.2,
    textColor=SLATE,
)
BODY_WHITE = ParagraphStyle(
    "BodyWhite",
    parent=BODY,
    fontSize=10.5,
    leading=14.2,
    textColor=HexColor("#CDE2EC"),
)
CARD_TITLE = ParagraphStyle(
    "CardTitle",
    fontName="LSPBody-Bold",
    fontSize=10.4,
    leading=12.4,
    textColor=INK,
)
CARD_TEXT = ParagraphStyle(
    "CardText",
    fontName="LSPBody",
    fontSize=7.7,
    leading=9.4,
    textColor=SLATE,
)
STEP_TITLE = ParagraphStyle(
    "StepTitle",
    fontName="LSPBody-Bold",
    fontSize=9.2,
    leading=11,
    textColor=INK,
    alignment=TA_CENTER,
)
STEP_TEXT = ParagraphStyle(
    "StepText",
    fontName="LSPBody",
    fontSize=7.4,
    leading=9.2,
    textColor=SLATE,
    alignment=TA_CENTER,
)
QR_TITLE = ParagraphStyle(
    "QrTitle",
    fontName="LSPDisplay-Bold",
    fontSize=14,
    leading=16,
    textColor=WHITE,
)
QR_TEXT = ParagraphStyle(
    "QrText",
    fontName="LSPBody",
    fontSize=8.7,
    leading=11,
    textColor=HexColor("#C8DFE9"),
)


def draw_paragraph(
    pdf: canvas.Canvas,
    text: str,
    style: ParagraphStyle,
    x: float,
    y_top: float,
    width: float,
    height: float,
) -> float:
    paragraph = Paragraph(text, style)
    _, used_height = paragraph.wrap(width, height)
    paragraph.drawOn(pdf, x, y_top - used_height)
    return used_height


def draw_shield(pdf: canvas.Canvas, x: float, y: float, size: float) -> None:
    pdf.saveState()
    pdf.setStrokeColor(TEAL)
    pdf.setLineWidth(2.2)
    pdf.setFillColor(NAVY_2)
    path = pdf.beginPath()
    path.moveTo(x, y + size)
    path.lineTo(x + size * 0.42, y + size * 0.84)
    path.lineTo(x + size * 0.84, y + size)
    path.lineTo(x + size * 0.78, y + size * 0.43)
    path.curveTo(x + size * 0.72, y + size * 0.18, x + size * 0.53, y + size * 0.06, x + size * 0.42, y)
    path.curveTo(x + size * 0.31, y + size * 0.06, x + size * 0.12, y + size * 0.18, x + size * 0.06, y + size * 0.43)
    path.close()
    pdf.drawPath(path, fill=1, stroke=1)
    pdf.setStrokeColor(CYAN)
    pdf.setLineWidth(2.7)
    pdf.line(x + size * 0.25, y + size * 0.51, x + size * 0.38, y + size * 0.38)
    pdf.line(x + size * 0.38, y + size * 0.38, x + size * 0.62, y + size * 0.68)
    pdf.restoreState()


def draw_background(pdf: canvas.Canvas) -> None:
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    header_height = 74 * mm
    pdf.setFillColor(NAVY)
    pdf.rect(0, PAGE_HEIGHT - header_height, PAGE_WIDTH, header_height, fill=1, stroke=0)
    pdf.setFillColor(NAVY_2)
    pdf.circle(PAGE_WIDTH - 2 * mm, PAGE_HEIGHT - 16 * mm, 55 * mm, fill=1, stroke=0)
    pdf.setStrokeColor(HexColor("#16445A"))
    pdf.setLineWidth(0.6)
    for radius in (20, 30, 40, 50):
        pdf.circle(PAGE_WIDTH - 29 * mm, PAGE_HEIGHT - 35 * mm, radius * mm, fill=0, stroke=1)

    pdf.setFillColor(TEAL)
    pdf.rect(0, PAGE_HEIGHT - 3.5 * mm, PAGE_WIDTH, 3.5 * mm, fill=1, stroke=0)
    pdf.rect(0, 0, PAGE_WIDTH, 3.5 * mm, fill=1, stroke=0)
    draw_shield(pdf, PAGE_WIDTH - 57 * mm, PAGE_HEIGHT - 61 * mm, 26 * mm)


def draw_header(pdf: canvas.Canvas) -> None:
    left = 16 * mm
    pdf.setFont("LSPBody-Bold", 8.5)
    pdf.setFillColor(CYAN)
    pdf.drawString(left, PAGE_HEIGHT - 20 * mm, "FREE + OPEN SOURCE CYBERSECURITY")

    pdf.setFont("LSPDisplay-Bold", 35)
    pdf.setFillColor(WHITE)
    pdf.drawString(left, PAGE_HEIGHT - 37 * mm, "LeakShield Pro")

    pdf.setFont("LSPDisplay-Bold", 16)
    pdf.setFillColor(TEAL)
    pdf.drawString(left, PAGE_HEIGHT - 47 * mm, "Find. Understand. Fix.")

    draw_paragraph(
        pdf,
        "An evidence-first cybersecurity assessment platform for authorized public websites, code, configuration and project folders.",
        BODY_WHITE,
        left,
        PAGE_HEIGHT - 54 * mm,
        126 * mm,
        20 * mm,
    )


def draw_badge(pdf: canvas.Canvas, x: float, y: float, width: float, label: str, fill, text_color) -> None:
    pdf.setFillColor(fill)
    pdf.roundRect(x, y, width, 9 * mm, 4.5 * mm, fill=1, stroke=0)
    pdf.setFillColor(text_color)
    pdf.setFont("LSPBody-Bold", 7.5)
    pdf.drawCentredString(x + width / 2, y + 3.1 * mm, label)


def draw_intro(pdf: canvas.Canvas) -> None:
    left = 16 * mm
    top = PAGE_HEIGHT - 84 * mm
    pdf.setFillColor(TEAL_DARK)
    pdf.setFont("LSPBody-Bold", 8)
    pdf.drawString(left, top, "THE PROJECT IN ONE SENTENCE")

    intro_style = ParagraphStyle(
        "Intro",
        fontName="LSPDisplay-Bold",
        fontSize=14.2,
        leading=18,
        textColor=INK,
    )
    draw_paragraph(
        pdf,
        "LeakShield Pro safely discovers public security weaknesses, shows the exact evidence, explains the risk, and guides developers toward a secure fix.",
        intro_style,
        left,
        top - 4 * mm,
        178 * mm,
        28 * mm,
    )

    badge_y = top - 31 * mm
    draw_badge(pdf, left, badge_y, 54 * mm, "EXACT EVIDENCE", PALE_TEAL, TEAL_DARK)
    draw_badge(pdf, left + 58 * mm, badge_y, 54 * mm, "SAFE PASSIVE CHECKS", PALE_BLUE, INK)
    draw_badge(pdf, left + 116 * mm, badge_y, 54 * mm, "NO PAID API", PALE_GOLD, HexColor("#74520A"))


def draw_section_heading(pdf: canvas.Canvas, text: str, x: float, y: float) -> None:
    pdf.setFillColor(TEAL)
    pdf.roundRect(x, y - 1.2 * mm, 4 * mm, 4 * mm, 2 * mm, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.setFont("LSPDisplay-Bold", 13.5)
    pdf.drawString(x + 7 * mm, y, text)


def draw_card(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    number: str,
    title: str,
    detail: str,
    fill,
) -> None:
    pdf.setFillColor(fill)
    pdf.setStrokeColor(BORDER)
    pdf.setLineWidth(0.7)
    pdf.roundRect(x, y, width, height, 3.5 * mm, fill=1, stroke=1)

    pdf.setFillColor(TEAL)
    pdf.circle(x + 7 * mm, y + height - 7 * mm, 3.2 * mm, fill=1, stroke=0)
    pdf.setFillColor(WHITE)
    pdf.setFont("LSPBody-Bold", 6.8)
    pdf.drawCentredString(x + 7 * mm, y + height - 8.1 * mm, number)

    draw_paragraph(pdf, title, CARD_TITLE, x + 13 * mm, y + height - 4.6 * mm, width - 17 * mm, 10 * mm)
    draw_paragraph(pdf, detail, CARD_TEXT, x + 6 * mm, y + height - 12 * mm, width - 12 * mm, height - 14 * mm)


def draw_capabilities(pdf: canvas.Canvas) -> None:
    left = 16 * mm
    heading_y = PAGE_HEIGHT - 130 * mm
    draw_section_heading(pdf, "WHAT IT CHECKS", left, heading_y)

    gap = 4 * mm
    card_width = (178 * mm - gap) / 2
    card_height = 24 * mm
    row_gap = 2.5 * mm
    cards = [
        ("01", "Attack Surface", "Public pages, endpoints, admin/login routes, robots.txt, sitemap.xml and JavaScript links.", PALE_TEAL),
        ("02", "Headers, TLS & DNS", "CSP, HSTS, cookies, CORS, certificates, encryption and email-security records.", PALE_BLUE),
        ("03", "Subdomains & Technology", "crt.sh plus DNS discovery, alive status, IP, HTTP response, TLS and technology signals.", WHITE),
        ("04", "Secrets & Exposed Files", "Potential API keys, tokens, database URLs, private keys, Git, env and backup files.", PALE_GOLD),
        ("05", "Web & CVE Signals", "Forms, CSRF visibility, uploads, redirects, error leakage, common ports and exact-version CVEs.", PALE_BLUE),
        ("06", "Learning & Fix Assistant", "Business impact, risk priority, OWASP/CWE mapping and framework-specific remediation.", PALE_TEAL),
    ]

    top_y = heading_y - 9 * mm
    for index, values in enumerate(cards):
        column = index % 2
        row = index // 2
        x = left + column * (card_width + gap)
        y = top_y - card_height - row * (card_height + row_gap)
        draw_card(pdf, x, y, card_width, card_height, *values)


def draw_workflow(pdf: canvas.Canvas) -> None:
    left = 16 * mm
    heading_y = 72.5 * mm
    draw_section_heading(pdf, "HOW IT WORKS", left, heading_y)

    steps = [
        ("01", "INPUT", "Authorized URL, text or project"),
        ("02", "ANALYZE", "Bounded public security checks"),
        ("03", "PROVE", "Exact location and redacted evidence"),
        ("04", "FIX", "Priority, learning and remediation"),
    ]
    gap = 3 * mm
    width = (178 * mm - 3 * gap) / 4
    box_y = 44 * mm
    box_height = 24 * mm

    for index, (number, title, detail) in enumerate(steps):
        x = left + index * (width + gap)
        pdf.setFillColor(WHITE)
        pdf.setStrokeColor(BORDER)
        pdf.roundRect(x, box_y, width, box_height, 3 * mm, fill=1, stroke=1)

        pdf.setFillColor(NAVY)
        pdf.circle(x + width / 2, box_y + box_height - 6 * mm, 4 * mm, fill=1, stroke=0)
        pdf.setFillColor(CYAN)
        pdf.setFont("LSPBody-Bold", 7.3)
        pdf.drawCentredString(x + width / 2, box_y + box_height - 7.2 * mm, number)

        draw_paragraph(pdf, title, STEP_TITLE, x + 2 * mm, box_y + 13 * mm, width - 4 * mm, 7 * mm)
        draw_paragraph(pdf, detail, STEP_TEXT, x + 3 * mm, box_y + 8 * mm, width - 6 * mm, 8 * mm)

        if index < len(steps) - 1:
            start_x = x + width + 0.7 * mm
            end_x = start_x + gap - 1.4 * mm
            mid_y = box_y + box_height / 2
            pdf.setStrokeColor(TEAL)
            pdf.setLineWidth(1.2)
            pdf.line(start_x, mid_y, end_x, mid_y)


def draw_qr(pdf: canvas.Canvas, x: float, y: float, size: float) -> None:
    qr = QrCodeWidget(LIVE_URL)
    bounds = qr.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, pdf, x, y)


def draw_footer_panel(pdf: canvas.Canvas) -> None:
    panel_x = 16 * mm
    panel_y = 9 * mm
    panel_w = 178 * mm
    panel_h = 32 * mm
    pdf.setFillColor(NAVY)
    pdf.roundRect(panel_x, panel_y, panel_w, panel_h, 4 * mm, fill=1, stroke=0)

    qr_size = 24 * mm
    qr_x = panel_x + panel_w - qr_size - 5 * mm
    qr_y = panel_y + 4 * mm
    pdf.setFillColor(WHITE)
    pdf.roundRect(qr_x - 1.5 * mm, qr_y - 1.5 * mm, qr_size + 3 * mm, qr_size + 3 * mm, 2 * mm, fill=1, stroke=0)
    draw_qr(pdf, qr_x, qr_y, qr_size)

    draw_paragraph(pdf, "SCAN TO TRY THE LIVE PLATFORM", QR_TITLE, panel_x + 7 * mm, panel_y + panel_h - 6 * mm, 95 * mm, 9 * mm)
    draw_paragraph(
        pdf,
        "No Shodan. No mandatory paid AI. No exploit attacks.<br/><font color='#50D5EC'><b>leak-shield-pro-2-0.vercel.app</b></font>",
        QR_TEXT,
        panel_x + 7 * mm,
        panel_y + panel_h - 14 * mm,
        112 * mm,
        18 * mm,
    )

    pdf.setFillColor(HexColor("#8FB0BF"))
    pdf.setFont("LSPBody", 6.8)
    pdf.drawString(panel_x + 7 * mm, panel_y + 3.5 * mm, REPOSITORY_URL)
    pdf.drawRightString(qr_x - 5 * mm, panel_y + 3.5 * mm, "AUTHORIZED SECURITY ASSESSMENTS ONLY")


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(
        str(OUTPUT),
        pagesize=A4,
        pageCompression=1,
    )
    pdf.setTitle("LeakShield Pro - A4 Exhibition One-Pager")
    pdf.setAuthor("LeakShield Pro")
    pdf.setSubject("Print-ready overview for exhibition table display")

    draw_background(pdf)
    draw_header(pdf)
    draw_intro(pdf)
    draw_capabilities(pdf)
    draw_workflow(pdf)
    draw_footer_panel(pdf)

    pdf.showPage()
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
