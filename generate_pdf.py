import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
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
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#4A5568"))
        
        # Don't draw running header on cover/page 1 if desired, but for formal standard policy we show it from page 2
        if self._pageNumber > 1:
            # Running header
            self.drawString(54, 11 * inch - 36, "BUSINESS SCHOOL IT POLICY MANUAL | SYSTEM ADMINISTRATION STANDARDS")
            self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "REF: B-SCH-IT-SYSADMIN-2026")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)
        
        # Running footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 46, 8.5 * inch - 54, 46)
        
        self.drawString(54, 32, "CONFIDENTIAL & PROPRIETARY — ACADEMIC & IT GOVERNANCE COUNCIL")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 32, page_text)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#1E3A8A")   # Navy Blue
    secondary_color = colors.HexColor("#0D9488") # Deep Teal
    dark_text = colors.HexColor("#1F2937")       # Dark Slate
    light_bg = colors.HexColor("#F8FAFC")        # Off white
    border_color = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#475569"),
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_text,
        spaceAfter=5
    )

    body_bold = ParagraphStyle(
        'Body_Bold_Custom',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=dark_text
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.white
    )

    story = []

    # Title & Header Block
    story.append(Paragraph("INSTITUTIONAL IT POLICY FOR SYSTEM ADMINISTRATION", title_style))
    story.append(Paragraph("Standard Operating Procedures, Access Controls, Infrastructure Governance & Compliance for Business Schools", subtitle_style))
    
    # Metadata Table
    meta_data = [
        [Paragraph("<b>Document Ref:</b> B-SCH-IT-SYSADMIN-2026", table_cell), Paragraph("<b>Version:</b> 2.4 (Enterprise)", table_cell)],
        [Paragraph("<b>Effective Date:</b> Academic Year 2026–2027", table_cell), Paragraph("<b>Review Cycle:</b> Bi-annual / Post-Audit", table_cell)],
        [Paragraph("<b>Approved By:</b> IT Governance Board & Dean", table_cell), Paragraph("<b>Target Scope:</b> System Administrators, Network Engineers, DBAs", table_cell)]
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # Section 1: Executive Summary & Scope
    story.append(Paragraph("1. Purpose, Scope & Administrative Authority", h1_style))
    story.append(Paragraph(
        "This policy defines mandatory operational security, privileged access management, infrastructure maintenance, "
        "and disaster recovery rules for Systems Administrators, Network Engineers, and Cloud Operators within a Business School. "
        "Because management institutions govern confidential admissions data, sensitive executive compensation benchmarks, "
        "valuable proprietary case research, and high-stakes digital examination environments, system administration demands "
        "the highest tier of zero-trust verification and audit readiness.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Section 2: Privileged Access Management (PAM) & Root Account Governance
    story.append(Paragraph("2. Privileged Access Management (PAM) & Account Hierarchy", h1_style))
    story.append(Paragraph(
        "<b>2.1 Principle of Least Privilege (PoLP):</b> Full administrative ('root' or 'Domain Admin') privileges shall never be "
        "permanently assigned to individual personal accounts. Routine administrative tasks must use designated secondary admin "
        "accounts (e.g., <i>adm.john.doe</i>) requiring Hardware-bound Multi-Factor Authentication (FIDO2/WebAuthn).",
        body_style
    ))
    story.append(Paragraph(
        "<b>2.2 Break-Glass Emergency Protocols:</b> Root passwords for master hypervisors (VMware vSphere / Proxmox), core firewalls, "
        "and top-level cloud tenants (AWS/Azure/GCP) must be stored in a tamper-evident Enterprise Secrets Vault (e.g., CyberArk, "
        "HashiCorp Vault) governed by dual-custody authorization. Access generates immediate SMS/Email alerts to the CIO and Director.",
        body_style
    ))
    story.append(Paragraph(
        "<b>2.3 Separation of Duties:</b> No single system administrator shall have simultaneous unchecked control over both student "
        "grade databases (SIS/ERP) and audit/log retention servers.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Section 3: Server & Virtualization Management
    story.append(Paragraph("3. Server Infrastructure, Virtualization & Baseline Hardening", h1_style))
    story.append(Paragraph(
        "<b>3.1 OS Hardening:</b> All Windows Server and Linux enterprise hosts must strictly adhere to CIS (Center for Internet Security) "
        "Level 1 Benchmark baselines before commissioning. Unnecessary services, default accounts, SMBv1, and legacy cipher suites (TLS 1.0/1.1) must be disabled.",
        body_style
    ))
    story.append(Paragraph(
        "<b>3.2 Golden Images & Container Security:</b> Production VMs and Docker/Kubernetes images must be built from approved, "
        "immutable base templates scanned for vulnerabilities prior to deployment. SSH access is restricted to encrypted Bastion jump-hosts using key pairs only (no password auth).",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Section 4: Academic Systems Special Operating Environments
    story.append(Paragraph("4. Specialized Academic Environments Governance", h1_style))
    story.append(Paragraph(
        "Business Schools host unique computing workloads requiring customized systems administration protocols:",
        body_style
    ))

    lab_table_data = [
        [Paragraph("Academic Facility / Workload", table_header), Paragraph("Key Systems Administration Mandates", table_header)],
        [
            Paragraph("<b>Financial Trading & Analytics Labs</b><br/>(Bloomberg, Refinitiv, FactSet, WRDS)", table_cell),
            Paragraph("• Enforce static IP binding and hardware MAC reservation.<br/>• Configure monthly API download quota alarms to prevent vendor licensing penalties.<br/>• Nightly automated wipe of temp scratch disks, cache files, and browser data.", table_cell)
        ],
        [
            Paragraph("<b>Digital Exam & Evaluation Portals</b><br/>(Secure LMS, Safe Exam Browser)", table_cell),
            Paragraph("• Lockdown mode: disable hyperthreading/virtual machines, clipboard access, secondary monitors.<br/>• System Admins must perform automated load testing 72h prior to peak midterm/final exam cohorts.<br/>• Dedicated isolated VLAN with whitelist-only outbound routing during live exam hours.", table_cell)
        ],
        [
            Paragraph("<b>High-Performance Research Compute</b><br/>(Econometrics, Monte Carlo, ML clusters)", table_cell),
            Paragraph("• SLURM/Kubernetes queue management with fair-share scheduling across faculty cohorts.<br/>• Automated scrub of scratch storage after 30 days of job completion; long-term data archived to Tier-2 S3 cold storage.", table_cell)
        ]
    ]

    lab_table = Table(lab_table_data, colWidths=[170, 334])
    lab_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(lab_table)
    story.append(Spacer(1, 10))

    # Section 5: Patch Management & Change Control
    story.append(Paragraph("5. Patch Management, Maintenance Windows & Change Control (ITIL)", h1_style))
    story.append(Paragraph(
        "<b>5.1 Change Advisory Board (CAB):</b> Any modification to core switches, firewalls, SIS/LMS databases, or domain controllers "
        "requires a submitted Request for Change (RFC) including a comprehensive rollback strategy approved 48 hours in advance.",
        body_style
    ))
    story.append(Paragraph(
        "<b>5.2 Patching Cadence:</b>",
        body_style
    ))

    patch_data = [
        [Paragraph("Vulnerability Severity", table_header), Paragraph("CVSS Score", table_header), Paragraph("Testing SLA", table_header), Paragraph("Production Deployment SLA", table_header)],
        [Paragraph("<b>Critical / Zero-Day</b>", table_cell), Paragraph("9.0 - 10.0", table_cell), Paragraph("Within 12 Hours", table_cell), Paragraph("Within 24 Hours (Emergency CAB)", table_cell)],
        [Paragraph("<b>High Severity</b>", table_cell), Paragraph("7.0 - 8.9", table_cell), Paragraph("Within 3 Days", table_cell), Paragraph("Within 7 Days", table_cell)],
        [Paragraph("<b>Medium / Routine</b>", table_cell), Paragraph("4.0 - 6.9", table_cell), Paragraph("During Staging Cycle", table_cell), Paragraph("Monthly Maintenance Window", table_cell)]
    ]
    patch_table = Table(patch_data, colWidths=[120, 80, 130, 174])
    patch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), secondary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(patch_table)
    story.append(Paragraph(
        "<b>5.3 Maintenance Windows:</b> Routine server restarts and updates are strictly scheduled between <b>Saturday 23:00 and Sunday 04:00 IST</b>. "
        "No routine maintenance is permitted during midterm or final examination weeks.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Section 6: Backup, Disaster Recovery & High Availability
    story.append(Paragraph("6. Backup Architecture, RTO/RPO & Disaster Recovery", h1_style))
    story.append(Paragraph(
        "<b>6.1 The 3-2-1-1 Backup Rule:</b> All production data (SIS, ERP, LMS, Research Repositories) must follow the enhanced "
        "institutional standard: <b>3</b> copies of data, across <b>2</b> different media formats, <b>1</b> copy off-site (secondary campus or cloud), "
        "and <b>1</b> copy stored completely offline or on an <b>Immutable/WORM</b> (Write Once, Read Many) air-gapped target to mitigate ransomware.",
        body_style
    ))

    bcdr_data = [
        [Paragraph("System Tier", table_header), Paragraph("Target Workload", table_header), Paragraph("RPO (Max Data Loss)", table_header), Paragraph("RTO (Max Downtime)", table_header)],
        [Paragraph("<b>Tier 1 (Mission-Critical)</b>", table_cell), Paragraph("SIS, ERP, Live Exam Engine, Cloud SSO", table_cell), Paragraph("≤ 15 Minutes", table_cell), Paragraph("≤ 2 Hours", table_cell)],
        [Paragraph("<b>Tier 2 (Academic Core)</b>", table_cell), Paragraph("LMS Archives, Library Databases, File Shares", table_cell), Paragraph("≤ 4 Hours", table_cell), Paragraph("≤ 8 Hours", table_cell)],
        [Paragraph("<b>Tier 3 (Ancillary)</b>", table_cell), Paragraph("Alumni Portal, Print Servers, Public CMS", table_cell), Paragraph("≤ 24 Hours", table_cell), Paragraph("≤ 24 Hours", table_cell)]
    ]
    bcdr_table = Table(bcdr_data, colWidths=[120, 160, 110, 114])
    bcdr_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(bcdr_table)
    story.append(Paragraph(
        "<b>6.2 Restore Testing:</b> Automated synthetic restores must execute weekly. Full bare-metal disaster recovery drills "
        "must be conducted bi-annually and signed off by the Head of IT Systems.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Section 7: Logging, SIEM & Forensic Monitoring
    story.append(Paragraph("7. Centralized Auditing, SIEM & Retention Standards", h1_style))
    story.append(Paragraph(
        "<b>7.1 Universal Syslog Forwarding:</b> System administrators must configure all switches, firewalls, active directory domain controllers, "
        "VPN concentrators, and database engines to forward audit logs in real-time to a central SIEM (Security Information and Event Management) server.",
        body_style
    ))
    story.append(Paragraph(
        "<b>7.2 Tamper-Resistance & Retention:</b> Audit logs must be encrypted, checksum-verified (SHA-256), and retained for a minimum of "
        "<b>365 days</b> in compliance with educational regulatory directives (e.g., UGC/AICTE, FERPA, GDPR). Logs cannot be truncated, edited, or deleted even by root administrators.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Section 8: Compliance & Violation Protocol
    story.append(Paragraph("8. Administrator Code of Ethics & Sanctions", h1_style))
    story.append(Paragraph(
        "System administrators operate in a position of trust. Administrators are expressly prohibited from inspecting student or "
        "faculty mailboxes, research folders, or private communications without written authorization from the Dean and Legal Counsel. "
        "Intentional bypassing of logging, unauthorized privilege escalation, or sharing of institutional keys is subject to summary termination "
        "and prosecution under national cyber laws (e.g., Information Technology Act / Computer Fraud and Abuse Act).",
        body_style
    ))
    story.append(Spacer(1, 14))

    # Sign-off block
    sign_block = [
        [Paragraph("<b>Prepared By:</b>", table_cell), Paragraph("<b>Reviewed By:</b>", table_cell), Paragraph("<b>Approved By:</b>", table_cell)],
        [
            Paragraph("Lead Systems Administrator<br/>Infrastructure & Cloud Engineering", table_cell),
            Paragraph("Chief Information Security Officer (CISO)<br/>IT Governance Board", table_cell),
            Paragraph("Director / Dean<br/>Executive Academic Council", table_cell)
        ],
        [Paragraph("Signature: _______________________", table_cell), Paragraph("Signature: _______________________", table_cell), Paragraph("Signature: _______________________", table_cell)]
    ]
    sign_table = Table(sign_block, colWidths=[168, 168, 168])
    sign_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94A3B8")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(KeepTogether(sign_table))

    doc.build(story, canvasmaker=NumberedCanvas)

if __name__ == "__main__":
    output_pdf = r"d:\Antigravity\IIBS\Business_School_System_Administration_IT_Policy.pdf"
    build_pdf(output_pdf)
    print(f"Successfully generated PDF: {output_pdf}")
