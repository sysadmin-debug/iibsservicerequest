import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header (from page 2 onwards)
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "BASIC INSTITUTIONAL IT POLICY & IMPLEMENTATION FRAMEWORK")
            self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "IT USAGE, SECURITY & GOVERNANCE")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(54, 11 * inch - 40, 8.5 * inch - 54, 11 * inch - 40)
        
        # Footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(54, 42, 8.5 * inch - 54, 42)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 30, "Institutional IT & Systems Policy | Approved & Circulated for Campus Implementation")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 30, page_text)
        self.restoreState()

def build_basic_pdf(filename="Basic_Institutional_IT_Policy.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        bottomMargin=50,
        topMargin=48
    )

    styles = getSampleStyleSheet()

    # Colors
    primary = colors.HexColor("#1E3A8A")     # Royal Blue
    secondary = colors.HexColor("#0284C7")   # Sky / Teal Accent
    dark_neutral = colors.HexColor("#1F2937") # Gray 800
    mid_neutral = colors.HexColor("#4B5563")  # Gray 600
    light_bg = colors.HexColor("#F8FAFC")     # Soft Gray
    callout_bg = colors.HexColor("#EFF6FF")   # Pale Blue
    border_col = colors.HexColor("#CBD5E1")

    # Typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=primary,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=mid_neutral,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=primary,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=secondary,
        spaceBefore=5,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=dark_neutral,
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_neutral,
        leftIndent=14,
        firstLineIndent=-9,
        spaceAfter=3
    )

    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=dark_neutral
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=dark_neutral
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=dark_neutral
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E3A8A")
    )

    story = []

    # ==================== PAGE 1 ====================
    story.append(Paragraph("INSTITUTIONAL IT &amp; SYSTEMS MANUAL", ParagraphStyle('SubTag', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=secondary)))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Basic Institutional IT Policy &amp; Implementation Guide", title_style))
    story.append(Paragraph("Formulation and Implementation of Policy Governing IT Usage, Security, and Governance with Full Stakeholder Awareness", subtitle_style))

    # Meta Overview Box
    meta_data = [
        [
            Paragraph("<b>Policy Status:</b> Approved &amp; Implemented", meta_val),
            Paragraph("<b>Target Audience:</b> All Staff &amp; Students", meta_val),
            Paragraph("<b>Effective Date:</b> Academic Year 2026-27", meta_val)
        ],
        [
            Paragraph("<b>Department:</b> IT &amp; Systems", meta_val),
            Paragraph("<b>Review Frequency:</b> Annual Review", meta_val),
            Paragraph("<b>Statutory Scope:</b> Usage, Security, Governance", meta_val)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[2.3*inch, 2.3*inch, 2.4*inch])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), light_bg),
        ('BOX', (0,0), (-1,-1), 1, border_col),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    # Core Purpose Callout
    callout_data = [
        [Paragraph("<b>Core Purpose:</b> To provide a clear, simple, and enforceable institutional IT policy that regulates IT usage, safeguards digital assets, ensures transparent governance, and ensures all faculty, administrative staff, and students are formally informed and compliant.", callout_text)]
    ]
    t_callout = Table(callout_data, colWidths=[7.0*inch])
    t_callout.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), callout_bg),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#93C5FD")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_callout)
    story.append(Spacer(1, 8))

    # SECTION 1: IT USAGE POLICY (AUP)
    story.append(Paragraph("1. IT Usage Policy (Acceptable Use Policy - AUP)", h1_style))
    story.append(Paragraph("Institutional computers, lab workstations, campus Wi-Fi, email, and portals are provided strictly to support education, coursework, and administrative duties.", body_style))
    story.append(Paragraph("&bull; <b>Academic &amp; Official Purpose:</b> IT infrastructure must be used for learning, teaching, research, and campus office work.", bullet_style))
    story.append(Paragraph("&bull; <b>Individual Login Responsibility:</b> Every student and staff member receives a unique ID. Sharing usernames, passwords, or OTPs is strictly prohibited.", bullet_style))
    story.append(Paragraph("&bull; <b>No Unauthorized Software:</b> Users must not download, install, or run unapproved software, games, or pirated media on institutional machines.", bullet_style))
    story.append(Paragraph("&bull; <b>Prohibited Activities:</b> Accessing inappropriate/illegal content, cyber-bullying, spamming, torrent downloads, cryptocurrency mining, and attempting to bypass campus network filters.", bullet_style))
    story.append(Spacer(1, 6))

    # SECTION 2: INFORMATION SECURITY POLICY
    story.append(Paragraph("2. IT Security Policy (Protection of Data &amp; Systems)", h1_style))
    story.append(Paragraph("To protect campus devices and user data from cyber threats, the following security standards are enforced across all departments:", body_style))

    sec_summary_data = [
        [Paragraph("Security Area", table_header), Paragraph("Key Policy Rule", table_header), Paragraph("Action Required by Users", table_header)],
        [
            Paragraph("<b>Password Security</b>", table_cell_bold),
            Paragraph("Minimum 8-12 characters combining letters, numbers, and symbols. Must be updated regularly.", table_cell),
            Paragraph("Never write passwords down or share with peers; lock system when leaving desk.", table_cell)
        ],
        [
            Paragraph("<b>Antivirus &amp; Updates</b>", table_cell_bold),
            Paragraph("All systems must run institutional antivirus/EDR and have OS updates enabled.", table_cell),
            Paragraph("Do not disable antivirus shields or bypass scheduled system updates.", table_cell)
        ],
        [
            Paragraph("<b>Network &amp; Wi-Fi</b>", table_cell_bold),
            Paragraph("Separation of Student Wi-Fi, Staff LAN, and Examination/Admin Networks.", table_cell),
            Paragraph("Connect only to official campus SSID; do not setup rogue hotspots or VPN tunnels.", table_cell)
        ],
        [
            Paragraph("<b>Data Protection &amp; Backup</b>", table_cell_bold),
            Paragraph("Important institutional files must be stored on approved institutional cloud/servers.", table_cell),
            Paragraph("Avoid storing sensitive student or financial data on unencrypted personal USB drives.", table_cell)
        ]
    ]
    t_sec_summary = Table(sec_summary_data, colWidths=[1.8*inch, 2.7*inch, 2.5*inch])
    t_sec_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary),
        ('BOX', (0,0), (-1,-1), 1, border_col),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg])
    ]))
    story.append(t_sec_summary)

    story.append(PageBreak())

    # ==================== PAGE 2 ====================
    # SECTION 3: IT GOVERNANCE & ROLES
    story.append(Paragraph("3. IT Governance &amp; Administration", h1_style))
    story.append(Paragraph("Governance ensures clear ownership, lifecycle maintenance, and transparent decision-making for all institutional technology:", body_style))
    story.append(Paragraph("&bull; <b>IT Steering Committee:</b> Headed by the Director/Principal with Deans and Head of IT. Responsible for setting priorities, budget approvals, and annual policy updates.", bullet_style))
    story.append(Paragraph("&bull; <b>IT &amp; Systems Department:</b> Responsible for day-to-day operations, lab upkeep, user account creation, network monitoring, security patching, and technical support.", bullet_style))
    story.append(Paragraph("&bull; <b>Asset Management &amp; Decommissioning:</b> Every computer, laptop, and network device is tagged in the asset register. Damaged or obsolete equipment is securely wiped and disposed of safely.", bullet_style))
    story.append(Spacer(1, 6))

    # SECTION 4: CIRCULATION & IMPLEMENTATION
    story.append(Paragraph("4. Implementation, Circulation &amp; Stakeholder Awareness", h1_style))
    story.append(Paragraph("To confirm that the approved policy is not just on paper but actively put into practice, the following four implementation pillars are executed:", body_style))

    impl_data = [
        [Paragraph("Implementation Step", table_header), Paragraph("How It Is Implemented", table_header), Paragraph("Evidence / Output", table_header)],
        [
            Paragraph("<b>1. Policy Circulation</b>", table_cell_bold),
            Paragraph("The approved IT Policy is circulated via institutional email to all staff and students and hosted permanently on the intranet/portal.", table_cell),
            Paragraph("Official email circular, student handbook section, website notice.", table_cell)
        ],
        [
            Paragraph("<b>2. Student Awareness</b>", table_cell_bold),
            Paragraph("Conducted during annual Student Induction/Orientation. Briefing on cyber safety, responsible internet use, and lab rules.", table_cell),
            Paragraph("Orientation schedule, attendance log, student declaration forms.", table_cell)
        ],
        [
            Paragraph("<b>3. Staff Awareness</b>", table_cell_bold),
            Paragraph("Included in the new-employee joining kit and annual faculty/staff refresher workshops on phishing prevention and data handling.", table_cell),
            Paragraph("HR joining checklist, IT clearance forms, workshop records.", table_cell)
        ],
        [
            Paragraph("<b>4. Technical Enforcement</b>", table_cell_bold),
            Paragraph("Firewall content filtering, mandatory digital undertaking prompt on first Wi-Fi/ERP login, and automatic account deactivation upon departure.", table_cell),
            Paragraph("Firewall log reports, active user directories, deprovisioning logs.", table_cell)
        ]
    ]
    t_impl = Table(impl_data, colWidths=[1.8*inch, 3.2*inch, 2.0*inch])
    t_impl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), secondary),
        ('BOX', (0,0), (-1,-1), 1, border_col),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg])
    ]))
    story.append(t_impl)
    story.append(Spacer(1, 8))

    # SECTION 5: INCIDENT HANDLING & DISCIPLINARY ACTIONS
    story.append(Paragraph("5. Incident Reporting &amp; Compliance", h1_style))
    story.append(Paragraph("Any IT issue, lost device, password breach, or suspected virus infection must be reported immediately to the IT Helpdesk. Non-compliance results in graded actions:", body_style))
    story.append(Paragraph("&bull; <b>First / Minor Breach:</b> Warning letter and temporary Wi-Fi access restriction until security refresher is completed.", bullet_style))
    story.append(Paragraph("&bull; <b>Repeat / Serious Breach:</b> Formal suspension of IT privileges, referral to College Disciplinary Committee, and academic/disciplinary warning.", bullet_style))
    story.append(Paragraph("&bull; <b>Malicious / Criminal Action:</b> Permanent debarment/termination and escalation under statutory cyber laws (IT Act).", bullet_style))
    story.append(Spacer(1, 12))

    # SECTION 6: APPROVAL & SIGN-OFF
    story.append(Paragraph("6. Formal Approval &amp; Implementation Sign-off", h1_style))
    story.append(Paragraph("This basic IT policy has been reviewed, approved by institutional leadership, and circulated for immediate implementation:", body_style))
    story.append(Spacer(1, 4))

    sign_data = [
        [Paragraph("Formulated By", table_cell_bold), Paragraph("Verified By", table_cell_bold), Paragraph("Approved &amp; Issued By", table_cell_bold)],
        [
            Paragraph("<br/><br/><b>Head - IT &amp; Systems</b><br/>IT Infrastructure &amp; Services", table_cell),
            Paragraph("<br/><br/><b>Registrar / Dean</b><br/>Institutional Administration", table_cell),
            Paragraph("<br/><br/><b>Director / Principal</b><br/>Governing Authority", table_cell)
        ],
        [
            Paragraph("Date: 28-Oct-2026", meta_val),
            Paragraph("Date: 29-Oct-2026", meta_val),
            Paragraph("Date: 30-Oct-2026", meta_val)
        ]
    ]

    t_sign = Table(sign_data, colWidths=[2.3*inch, 2.3*inch, 2.4*inch])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), light_bg),
        ('BOX', (0,0), (-1,-1), 1, border_col),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {filename}")

if __name__ == '__main__':
    build_basic_pdf("Basic_Institutional_IT_Policy.pdf")
