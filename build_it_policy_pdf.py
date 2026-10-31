import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
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
        
        # Header on all pages except Page 1
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "INTERNATIONAL INSTITUTE OF BUSINESS STUDIES (IIBS)")
            self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "INSTITUTIONAL IT POLICY & GOVERNANCE MANUAL")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(54, 11 * inch - 40, 8.5 * inch - 54, 11 * inch - 40)
        
        # Footer on all pages
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(54, 42, 8.5 * inch - 54, 42)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 30, "Doc Ref: IIBS-IT-POL-2026-V4 | Approved by Governing Body | IT Usage, Security & Governance")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 30, page_text)
        self.restoreState()

def build_pdf(filename="IIBS_Institutional_IT_Policy_Manual.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        bottomMargin=48,
        topMargin=46
    )

    styles = getSampleStyleSheet()

    # Colors
    primary = colors.HexColor("#0F2942")     # Deep Corporate Navy
    secondary = colors.HexColor("#0284C7")   # Electric Blue
    dark_neutral = colors.HexColor("#1E293B") # Slate 800
    mid_neutral = colors.HexColor("#475569")  # Slate 600
    light_bg = colors.HexColor("#F8FAFC")     # Soft light grey
    callout_bg = colors.HexColor("#EFF6FF")   # Soft blue
    border_col = colors.HexColor("#CBD5E1")

    # Typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=21,
        textColor=primary,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=mid_neutral,
        spaceAfter=8
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14.5,
        textColor=primary,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12.5,
        textColor=secondary,
        spaceBefore=4,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.2,
        leading=11.5,
        textColor=dark_neutral,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=dark_neutral,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2
    )

    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10,
        textColor=dark_neutral
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=dark_neutral
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=dark_neutral
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.8,
        leading=11,
        textColor=colors.HexColor("#1E3A8A")
    )

    story = []

    # ==================== PAGE 1: GOVERNANCE MANDATE, SCOPE & USAGE POLICY ====================
    story.append(Paragraph("INTERNATIONAL INSTITUTE OF BUSINESS STUDIES (IIBS)", ParagraphStyle('BrandHead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=secondary)))
    story.append(Spacer(1, 2))
    story.append(Paragraph("INSTITUTIONAL IT POLICY &amp; GOVERNANCE FRAMEWORK", title_style))
    story.append(Paragraph("Approved Institutional Regulations Governing IT Usage, Security Controls, Governance &amp; Compliance", subtitle_style))

    # Metadata Table
    meta_data = [
        [
            Paragraph("<b>Policy Reference:</b> IIBS/IT-POL/2026/V4.0", meta_val),
            Paragraph("<b>Effective Date:</b> November 01, 2026", meta_val),
            Paragraph("<b>Approval Authority:</b> Academic &amp; Governing Council", meta_val)
        ],
        [
            Paragraph("<b>Issuing Department:</b> IT &amp; Systems Directorate", meta_val),
            Paragraph("<b>Review Cycle:</b> Annual / Bi-annual Audit", meta_val),
            Paragraph("<b>Applicability:</b> All Faculty, Staff, Students, Vendors", meta_val)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[2.3*inch, 2.3*inch, 2.4*inch])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), light_bg),
        ('BOX', (0,0), (-1,-1), 1, border_col),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 5))

    # 1. Executive Summary & Statutory Mandate
    story.append(Paragraph("1. Executive Summary &amp; Statutory Mandate", h1_style))
    story.append(Paragraph(
        "Information Technology is foundational to pedagogy, scholarly research, administration, and corporate relations at the <b>International Institute of Business Studies (IIBS)</b>. "
        "This institutional IT Policy establishes an integrated standard to safeguard computing assets, networks, cloud platforms, and data assets while fostering modern digital learning. "
        "It defines acceptable operational parameters and security obligations binding across all faculty, administrative personnel, students, and affiliated contractors.",
        body_style
    ))

    statutory_note = [
        [Paragraph("<b>Institutional Declaration:</b> Formally approved and ratified by the Governing Body of IIBS. The policy has been circulated across campus and integrated into induction curricula. Staff and students are required to maintain strict adherence under the Information Technology Act 2000/2008, the Digital Personal Data Protection (DPDP) Act 2023, and institutional bylaws.", callout_text)]
    ]
    t_note = Table(statutory_note, colWidths=[7.0*inch])
    t_note.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), callout_bg),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#93C5FD")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_note)
    story.append(Spacer(1, 4))

    # 2. Scope & Applicability
    story.append(Paragraph("2. Scope &amp; Applicability", h1_style))
    story.append(Paragraph(
        "This policy governs all digital assets owned, operated, leased, or subscribed to by IIBS, including campus-based, hostel, and remote access channels:",
        body_style
    ))
    story.append(Paragraph("&bull; <b>Hardware &amp; Endpoints:</b> Workstations, institutional laptops, servers, switches, routers, firewalls, Wi-Fi APs, and biometric units.", bullet_style))
    story.append(Paragraph("&bull; <b>Enterprise Software:</b> ERP portals, Student Information System (SIS), LMS platforms, Tally Prime, and licensed software.", bullet_style))
    story.append(Paragraph("&bull; <b>Network &amp; Cloud:</b> Campus wired/wireless LANs, Google Workspace / M365 domains, cloud databases, and institutional email.", bullet_style))
    story.append(Paragraph("&bull; <b>Covered Users:</b> Regular/visiting faculty, administrative and technical staff, registered students, alumni, and third-party vendors.", bullet_style))
    story.append(Spacer(1, 4))

    # 3. IT Usage & Acceptable Use Policy
    story.append(Paragraph("3. IT Usage &amp; Acceptable Use Policy (AUP)", h1_style))
    story.append(Paragraph("<b>3.1 Permissible &amp; Academic Usage Guidelines:</b>", h2_style))
    story.append(Paragraph("&bull; <b>Academic Intent:</b> Bandwidth and terminals must be dedicated exclusively to academic delivery, research, and official institutional tasks.", bullet_style))
    story.append(Paragraph("&bull; <b>Account Credential Integrity:</b> Login accounts are non-transferable. Users are accountable for all transactions executed under their ID.", bullet_style))
    story.append(Paragraph("&bull; <b>Software Governance:</b> Only officially licensed software authorized by the IT &amp; Systems Department may be installed on campus devices.", bullet_style))

    story.append(Paragraph("<b>3.2 Prohibited Activities:</b>", h2_style))
    story.append(Paragraph("&bull; <b>Illegal &amp; Offensive Content:</b> Storing or circulating defamatory, infringing, adult, abusive, or socially disruptive digital material.", bullet_style))
    story.append(Paragraph("&bull; <b>Network Tampering:</b> Port scanning, packet sniffing, IP spoofing, credential brute-forcing, or operating P2P torrent applications.", bullet_style))
    story.append(Paragraph("&bull; <b>Commercial Exploitation &amp; Evasion:</b> Unauthorized crypto mining, personal commercial use, or deploying unauthorized proxies/VPNs.", bullet_style))

    story.append(PageBreak())

    # ==================== PAGE 2: SECURITY CONTROLS & GOVERNANCE ARCHITECTURE ====================
    # 4. Information Security & Cyber Defense Standards
    story.append(Paragraph("4. Information Security &amp; Cyber Defense Standards", h1_style))
    story.append(Paragraph(
        "IIBS enforces defense-in-depth principles to protect data confidentiality, system integrity, and academic continuity across all digital assets.",
        body_style
    ))

    sec_table_data = [
        [Paragraph("Security Domain", table_header), Paragraph("Mandatory Control Standard", table_header), Paragraph("Technical Enforcement Mechanism", table_header)],
        [
            Paragraph("<b>Identity &amp; Access (IAM)</b>", table_cell_bold),
            Paragraph("Enforce 12+ character alphanumeric passwords; mandatory 90-day password rotation; Multi-Factor Authentication (MFA) enabled for all faculty, staff, and admin portals.", table_cell),
            Paragraph("Active Directory / Google Workspace Admin IAM rules; automatic session timeout after 15 minutes of inactivity.", table_cell)
        ],
        [
            Paragraph("<b>Network &amp; Perimeter Defense</b>", table_cell_bold),
            Paragraph("Next-Generation Firewall (NGFW) with Unified Threat Management (UTM), Layer-7 content filtering, Intrusion Prevention System (IPS), and anti-malware gateway inspection.", table_cell),
            Paragraph("VLAN segmentation separating Student Labs, Faculty LAN, Administrative/Financial Systems, and Guest Wi-Fi.", table_cell)
        ],
        [
            Paragraph("<b>Endpoint Protection</b>", table_cell_bold),
            Paragraph("Centralized Endpoint Detection and Response (EDR) / Antivirus deployed on all managed machines. Auto-update enabled for signatures and security hotfixes.", table_cell),
            Paragraph("USB mass storage disablement on sensitive finance/exam terminals; BitLocker / FileVault disk encryption for institutional laptops.", table_cell)
        ],
        [
            Paragraph("<b>Data Protection &amp; Backup</b>", table_cell_bold),
            Paragraph("Standard 3-2-1 backup strategy for ERP, Examination records, and Financial databases. Daily differential, weekly full snapshot, and encrypted off-site cloud replication.", table_cell),
            Paragraph("Quarterly backup restoration drills and disaster recovery test-run supervised by the IT Systems Manager.", table_cell)
        ],
        [
            Paragraph("<b>Access Deprovisioning</b>", table_cell_bold),
            Paragraph("Revocation of IT assets and directory privileges within 24 hours of employee resignation/termination or student graduation.", table_cell),
            Paragraph("Formal HR/Registrar clearance checklist integration with IT Department sign-off.", table_cell)
        ]
    ]

    t_sec = Table(sec_table_data, colWidths=[1.8*inch, 3.2*inch, 2.0*inch])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary),
        ('BOX', (0,0), (-1,-1), 1, border_col),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg])
    ]))
    story.append(t_sec)
    story.append(Spacer(1, 8))

    # 5. IT Governance Architecture & Committees
    story.append(Paragraph("5. IT Governance Architecture &amp; Institutional Oversight", h1_style))
    story.append(Paragraph(
        "Institutional IT governance is structured across three tiers to ensure strategic alignment, fiscal accountability, and operational agility:",
        body_style
    ))

    gov_data = [
        [Paragraph("Governance Body / Role", table_header), Paragraph("Key Composition", table_header), Paragraph("Core Responsibilities &amp; Jurisdiction", table_header)],
        [
            Paragraph("<b>IT Steering &amp; Policy Committee</b>", table_cell_bold),
            Paragraph("Director, Dean Academics, Registrar, Head of IT, Chief Financial Officer.", table_cell),
            Paragraph("Strategic planning, budget allocation, annual policy ratification, high-risk security oversight, and digital transformation roadmaps.", table_cell)
        ],
        [
            Paragraph("<b>IT &amp; Systems Department</b>", table_cell_bold),
            Paragraph("Head - IT, Systems Administrators, Network Engineers, Lab Managers, Support Techs.", table_cell),
            Paragraph("Day-to-day infrastructure operations, incident response, network maintenance, hardware provisioning, user onboarding, and access control management.", table_cell)
        ],
        [
            Paragraph("<b>Information Security &amp; Compliance Cell</b>", table_cell_bold),
            Paragraph("Designated Data Protection Officer (DPO), IT Audit Lead, Legal Liaison.", table_cell),
            Paragraph("Audit statutory compliance (DPDP Act, UGC/AICTE norms), handle security incident escalations, maintain privacy registers, and lead breach response.", table_cell)
        ]
    ]

    t_gov = Table(gov_data, colWidths=[2.0*inch, 2.0*inch, 3.0*inch])
    t_gov.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), secondary),
        ('BOX', (0,0), (-1,-1), 1, border_col),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg])
    ]))
    story.append(t_gov)

    story.append(PageBreak())

    # ==================== PAGE 3: CIRCULATION, AWARENESS, INCIDENT MGMT & APPROVALS ====================
    # 6. Policy Circulation, Stakeholder Awareness & Implementation Roadmap
    story.append(Paragraph("6. Policy Circulation, Stakeholder Awareness &amp; Implementation Roadmap", h1_style))
    story.append(Paragraph(
        "To satisfy NAAC/NBA criteria and regulatory compliance, the approved IT Policy follows a four-phase operational dissemination framework:",
        body_style
    ))

    cycle_data = [
        [Paragraph("Implementation Phase", table_header), Paragraph("Target Group", table_header), Paragraph("Key Execution Mechanism &amp; Evidentiary Deliverables", table_header)],
        [
            Paragraph("<b>Phase 1: Formal Circulation &amp; Handbooks</b>", table_cell_bold),
            Paragraph("All Staff, Faculty &amp; Students", table_cell),
            Paragraph("Permanent hosting on Intranet/Portal; mandatory distribution during employee induction; inclusion in Student Academic Handbooks; email broadcast of approved PDF manual with digital receipt acknowledgement.", table_cell)
        ],
        [
            Paragraph("<b>Phase 2: Awareness &amp; Orientation Camps</b>", table_cell_bold),
            Paragraph("Freshmen Students &amp; New Recruits", table_cell),
            Paragraph("Mandatory Cyber Hygiene &amp; IT Orientation workshop during annual Student Induction (Deeksharambh); practical training on phishing prevention, data privacy, and secure portal access.", table_cell)
        ],
        [
            Paragraph("<b>Phase 3: Digital Undertaking &amp; Sign-off</b>", table_cell_bold),
            Paragraph("All Active System Users", table_cell),
            Paragraph("Users must read and accept a digital IT AUP Agreement upon first login each academic year before network/Wi-Fi/ERP credentials are instantiated.", table_cell)
        ],
        [
            Paragraph("<b>Phase 4: Ongoing Audits &amp; Phishing Drills</b>", table_cell_bold),
            Paragraph("Entire Campus Community", table_cell),
            Paragraph("Quarterly simulated phishing drills; biometric and physical lab access audits; annual 3rd-party vulnerability assessment &amp; penetration testing (VAPT); ISO 27001 readiness review.", table_cell)
        ]
    ]

    t_cycle = Table(cycle_data, colWidths=[1.8*inch, 1.8*inch, 3.4*inch])
    t_cycle.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary),
        ('BOX', (0,0), (-1,-1), 1, border_col),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg])
    ]))
    story.append(t_cycle)
    story.append(Spacer(1, 6))

    # 7. Incident Management, Violations & Disciplinary Framework
    story.append(Paragraph("7. Incident Reporting, Violations &amp; Disciplinary Framework", h1_style))
    story.append(Paragraph(
        "Any suspected security breach, malware infection, compromised credential, or policy violation must be reported immediately to <b>ithelpdesk@iibs.edu.in</b> or via the internal ticketing portal. Violations are categorized under a graded enforcement scale:",
        body_style
    ))
    story.append(Paragraph("&bull; <b>Tier 1 (Minor / Inadvertent):</b> Temporary campus Wi-Fi restriction (up to 7 days), mandatory cyber refresher training, and written advisory.", bullet_style))
    story.append(Paragraph("&bull; <b>Tier 2 (Moderate / Intentional):</b> Institutional portal suspension, lab debarment, financial restitution for damages, and official warning on academic/HR file.", bullet_style))
    story.append(Paragraph("&bull; <b>Tier 3 (Severe / Malicious / Legal):</b> Student expulsion or staff termination; statutory reporting to Law Enforcement (Cyber Crime Cell) under the IT Act.", bullet_style))
    story.append(Spacer(1, 8))

    # 8. Approval & Sign-Off Block
    story.append(Paragraph("8. Official Governance Approval &amp; Implementation Sign-off", h1_style))
    story.append(Paragraph("This document has been reviewed, ratified, and approved for institution-wide enforcement by the Governing Council:", body_style))
    story.append(Spacer(1, 3))

    sign_data = [
        [Paragraph("Prepared &amp; Formulated By", table_cell_bold), Paragraph("Reviewed &amp; Verified By", table_cell_bold), Paragraph("Sanctioned &amp; Approved By", table_cell_bold)],
        [
            Paragraph("<br/><br/><b>Head - IT &amp; Systems</b><br/>Department of Information Technology<br/>IIBS Campus", table_cell),
            Paragraph("<br/><br/><b>Registrar &amp; Compliance Head</b><br/>Institutional Administration<br/>IIBS Campus", table_cell),
            Paragraph("<br/><br/><b>Director / Academic Council Head</b><br/>Governing Body<br/>International Institute of Business Studies", table_cell)
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
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated clean 3-page PDF: {filename}")

if __name__ == '__main__':
    build_pdf("IIBS_Institutional_IT_Policy_Manual.pdf")
