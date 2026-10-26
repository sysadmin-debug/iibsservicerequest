import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

PDF_PATH = r"d:\Antigravity\IIBS\lab_manager\IIBS_Lab_Installation_Manual.pdf"

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages after page 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "IIBS Computer Lab Management - Step-by-Step Installation Manual")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 747, 558, 747)

        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 35, footer_text)
        self.drawString(54, 35, "INTERNATIONAL INSTITUTE OF BUSINESS STUDIES - IT LAB INFRASTRUCTURE")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def build_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a")
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#475569")
    )

    part_header = ParagraphStyle(
        'PartHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=14,
        spaceAfter=6
    )

    step_title = ParagraphStyle(
        'StepTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=8,
        spaceAfter=3
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        leftIndent=14,
        spaceAfter=2
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#0f172a")
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor("#0369a1")
    )

    elements = []

    # Title & Banner
    elements.append(Paragraph("IIBS Computer Lab Management System", title_style))
    elements.append(Spacer(1, 3))
    elements.append(Paragraph("Complete Step-by-Step Installation, Lockdown & Deployment Guide", subtitle_style))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2563eb"), spaceAfter=12))

    # Prerequisites Table
    elements.append(Paragraph("Prerequisites Checklist", step_title))
    prereq_data = [
        [Paragraph("<b>Item</b>", body_style), Paragraph("<b>Requirements</b>", body_style)],
        [Paragraph("<b>Teacher Master PC</b>", body_style), Paragraph("Windows 10/11, Python 3.8+ installed, connected to Lab LAN Switch/Router.", body_style)],
        [Paragraph("<b>Student Lab PCs</b>", body_style), Paragraph("Windows 10/11 connected to the same LAN switch/subnet.", body_style)],
        [Paragraph("<b>Network</b>", body_style), Paragraph("Local Area Network (LAN) / Ethernet Switch. External Internet is NOT required.", body_style)]
    ]
    tp = Table(prereq_data, colWidths=[130, 370])
    tp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(tp)
    elements.append(Spacer(1, 10))

    # PART 1: Master Server
    elements.append(Paragraph("PART 1: Setup Master Server (Teacher's PC)", part_header))
    
    elements.append(Paragraph("Step 1.1: Determine Teacher PC's LAN IP Address", step_title))
    elements.append(Paragraph("1. Press <b>Win + R</b>, type <code>cmd</code>, and press Enter.", bullet_style))
    elements.append(Paragraph("2. Run the command: <code>ipconfig</code>", bullet_style))
    elements.append(Paragraph("3. Note down your <b>IPv4 Address</b> (e.g., <code>192.168.1.100</code>). Student PCs will connect to this address.", bullet_style))

    elements.append(Paragraph("Step 1.2: Launch the Master Server", step_title))
    elements.append(Paragraph("1. Navigate to <code>d:\\Antigravity\\IIBS\\lab_manager\\</code> on the teacher's PC.", bullet_style))
    elements.append(Paragraph("2. Double-click <b><code>start_server.bat</code></b>.", bullet_style))
    elements.append(Paragraph("3. The batch script will automatically ensure dependencies (Flask, Werkzeug) are installed and start the server on port 5000.", bullet_style))

    elements.append(Paragraph("Step 1.3: Access the Web Control Portal", step_title))
    elements.append(Paragraph("Open any web browser (Chrome, Edge) and visit:", bullet_style))
    
    url_box = [[Paragraph("http://127.0.0.1:5000/admin   (or from any device: http://&lt;TEACHER_IP&gt;:5000/admin)", code_style)]]
    turl = Table(url_box, colWidths=[500])
    turl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(turl)
    elements.append(Spacer(1, 10))

    # PART 2: Student PC Setup
    elements.append(Paragraph("PART 2: Setup Student Lab PCs", part_header))
    
    elements.append(Paragraph("Method A: Standalone Executable (.exe) — Recommended (No Python Needed on Students)", step_title))
    elements.append(Paragraph("1. On the Teacher/Development PC, open Command Prompt and compile the client into an executable:", bullet_style))
    
    compile_box = [[Paragraph("pip install pyinstaller\ncd /d d:\\Antigravity\\IIBS\\lab_manager\\client\npyinstaller --onefile --noconsole client.py", code_style)]]
    tcomp = Table(compile_box, colWidths=[500])
    tcomp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(tcomp)
    elements.append(Paragraph("2. Inside <code>lab_manager\\client\\dist\\</code>, you will find <b><code>client.exe</code></b>.", bullet_style))
    elements.append(Paragraph("3. Copy two files to a USB drive: <b><code>client.exe</code></b> and <b><code>client_config.json</code></b>.", bullet_style))
    elements.append(Paragraph("4. On each student PC, create folder <code>C:\\LabClient\\</code> and paste both files there.", bullet_style))
    elements.append(Paragraph("5. Open <code>client_config.json</code> in Notepad and set the Teacher's LAN IP address:", bullet_style))

    conf_box = [[Paragraph('{\n    "server_url": "http://192.168.1.100:5000"\n}', code_style)]]
    tconf = Table(conf_box, colWidths=[500])
    tconf.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(tconf)

    elements.append(Paragraph("Method B: Direct Script Execution (If Python is Already Installed)", step_title))
    elements.append(Paragraph("Copy the <code>lab_manager\\client\\</code> folder to the student PC, configure the IP in <code>client_config.json</code>, and double-click <b><code>start_client.bat</code></b>.", bullet_style))
    elements.append(Spacer(1, 10))

    # Page Break for clean reading
    elements.append(PageBreak())

    # PART 3: Security & Lockdown
    elements.append(Paragraph("PART 3: Student PC Security & Non-Admin Lockdown", part_header))
    
    elements.append(Paragraph("Step 3.1: Create Standard (Non-Admin) Account", step_title))
    elements.append(Paragraph("1. Open Windows <b>Settings &gt; Accounts &gt; Other users</b>.", bullet_style))
    elements.append(Paragraph("2. Click <b>Add account</b> and create a local user named <b>Student</b>.", bullet_style))
    elements.append(Paragraph("3. Ensure the Account Type remains <b>Standard User</b> (do NOT grant Administrator rights).", bullet_style))

    elements.append(Paragraph("Step 3.2: Configure Auto-Start on Boot", step_title))
    elements.append(Paragraph("1. Log in to the <code>Student</code> account.", bullet_style))
    elements.append(Paragraph("2. Press <b>Win + R</b>, type <code>shell:startup</code>, and press Enter.", bullet_style))
    elements.append(Paragraph("3. Create a shortcut to <code>C:\\LabClient\\client.exe</code> (or <code>start_client.bat</code>) inside this folder.", bullet_style))
    elements.append(Paragraph("<i>Result: Whenever the student machine boots, the kiosk lock screen launches automatically.</i>", callout_style))

    elements.append(Paragraph("Step 3.3: Disable Task Manager via Group Policy (Prevents Bypassing)", step_title))
    elements.append(Paragraph("1. Press <b>Win + R</b>, type <code>gpedit.msc</code>, and press Enter.", bullet_style))
    elements.append(Paragraph("2. Navigate to: <b>User Configuration &gt; Administrative Templates &gt; System &gt; Ctrl+Alt+Del Options</b>.", bullet_style))
    elements.append(Paragraph("3. Double-click <b>Remove Task Manager</b>, select <b>Enabled</b>, and click OK.", bullet_style))
    elements.append(Paragraph("<i>Result: Students cannot open Task Manager to kill the client process.</i>", callout_style))
    elements.append(Spacer(1, 10))

    # PART 4: Verification & Operations
    elements.append(Paragraph("PART 4: Daily Operations & Verification Guide", part_header))

    op_data = [
        [Paragraph("<b>Operation</b>", body_style), Paragraph("<b>How It Works & Admin Procedure</b>", body_style)],
        [
            Paragraph("<b>Student Registration</b>", body_style),
            Paragraph("On the kiosk lock screen, the student clicks <b>New Student Register</b>, enters Roll No, Full Name, Username, and Password. Account is saved on the Master Server, allowing instant login.", body_style)
        ],
        [
            Paragraph("<b>1-Click Exam Mode (Student Internet Cutoff)</b>", body_style),
            Paragraph("In the Admin Portal, click <b>'Enable Exam Mode (Block Student Internet)'</b>. All student PCs switch to normal usable desktop mode, but external internet (ports 80, 443, 53) is blocked via Windows Firewall. <b>IMPORTANT: The LAB MASTER PC (Teacher Server) is strictly EXCLUDED and retains full, uninterrupted internet access.</b> Click <b>'End Exam & Restore Internet'</b> when finished.", body_style)
        ],
        [
            Paragraph("<b>One-Shot File Broadcast</b>", body_style),
            Paragraph("In Admin Portal &gt; <i>File Broadcast</i>, upload any assignment or PDF. All logged-in student PCs download it automatically to <code>Desktop\\Lab_Shared_Files\\</code>.", body_style)
        ],
        [
            Paragraph("<b>1-Hour Idle Auto-Shutdown</b>", body_style),
            Paragraph("Tracks native Windows mouse/keyboard movement. If inactive for 60 minutes, the client notifies the Master Server and executes <code>shutdown /s /t 30</code>.", body_style)
        ],
        [
            Paragraph("<b>Password Reset</b>", body_style),
            Paragraph("Search any student in the Admin Portal, click <b>Reset Password</b>, enter a new password, and click Save. The student can log in immediately.", body_style)
        ],
        [
            Paragraph("<b>Audit Logs Export</b>", body_style),
            Paragraph("Click <b>'Export Logs (CSV)'</b> on the portal to download a spreadsheet report of all registrations, logins, exam sessions, and shutdowns.", body_style)
        ]
    ]
    to = Table(op_data, colWidths=[130, 370])
    to.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(to)

    doc.build(elements, canvasmaker=NumberedCanvas)
    print("Installation Steps PDF generated at:", PDF_PATH)

if __name__ == '__main__':
    build_pdf()
