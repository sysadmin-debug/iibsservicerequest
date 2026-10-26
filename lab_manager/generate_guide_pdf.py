import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

PDF_PATH = r"d:\Antigravity\IIBS\lab_manager\IIBS_Lab_Admin_Guide.pdf"

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
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages after page 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "IIBS Computer Lab Management & Security Guide")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 747, 558, 747)

        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 35, footer_text)
        self.drawString(54, 35, "CONFIDENTIAL & PROPRIETARY - IIBS IT DEPARTMENT")
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
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1e293b")
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#475569")
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#1e40af"),
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#0f172a")
    )

    elements = []

    # Title Banner
    elements.append(Paragraph("IIBS Computer Lab Management System", title_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("Offline LAN Deployment, Exam Internet Cutoff & Administration Manual", subtitle_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2563eb"), spaceAfter=15))

    # Executive Overview
    elements.append(Paragraph("1. System Overview", h1_style))
    elements.append(Paragraph(
        "This software suite is tailored for institutional computer labs operating over pure LAN (no external internet required for operations). "
        "It provides student self-registration, credential-based desktop unlock, real-time activity monitoring, 1-hour idle auto-shutdown, "
        "one-shot broadcast file sharing, administrative password resets, and <b>1-Click Exam Mode</b> to block external internet across all machines while keeping desktop functionality.",
        body_style
    ))

    # Features Summary Table
    feature_data = [
        [Paragraph("<b>Component</b>", body_style), Paragraph("<b>Function & Mechanism</b>", body_style)],
        [Paragraph("<b>Master Server & Portal</b>", body_style), Paragraph("Runs on Teacher PC (Flask + SQLite). Exposes web dashboard on port 5000 for monitoring, file sharing, password resets, and exam toggles.", body_style)],
        [Paragraph("<b>Client Kiosk Agent</b>", body_style), Paragraph("Runs on student PCs. Fullscreen lock screen on boot. Unlocks upon student authentication into a lightweight session widget.", body_style)],
        [Paragraph("<b>Exam Internet Cutoff</b>", body_style), Paragraph("Blocks outbound HTTP/HTTPS/DNS (80, 443, 53) via Windows Firewall while whitelisting the Master Server IP. Allows normal desktop apps for exams.", body_style)],
        [Paragraph("<b>Idle Auto-Shutdown</b>", body_style), Paragraph("Tracks native Windows mouse/keyboard activity. If idle exceeds 60 minutes, system safely initiates shutdown to save energy.", body_style)],
        [Paragraph("<b>Audit & System Logs</b>", body_style), Paragraph("Records all logins, failed attempts, exam toggles, and shutdowns. Full CSV export available in 1 click.", body_style)]
    ]
    t = Table(feature_data, colWidths=[140, 360])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 15))

    # Step 1: Server Setup
    elements.append(Paragraph("2. Step 1: Teacher Master Server Setup", h1_style))
    elements.append(Paragraph("1. Obtain the Teacher PC's LAN IP address by running <code>ipconfig</code> in Command Prompt (e.g. <code>192.168.1.100</code>).", bullet_style))
    elements.append(Paragraph("2. Navigate to <code>d:\\Antigravity\\IIBS\\lab_manager\\</code> and double-click <b><code>start_server.bat</code></b>.", bullet_style))
    elements.append(Paragraph("3. Open any web browser on your PC or mobile device on the same LAN and navigate to:", bullet_style))
    
    server_code = [[Paragraph("http://127.0.0.1:5000/admin   (or http://&lt;TEACHER_IP&gt;:5000/admin)", code_style)]]
    tc = Table(server_code, colWidths=[500])
    tc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(tc)
    elements.append(Spacer(1, 12))

    # Step 2: Student PC Setup
    elements.append(Paragraph("3. Step 2: Student Lab PC Setup", h1_style))
    elements.append(Paragraph("1. Open <code>lab_manager\\client\\client_config.json</code> and set your Teacher's LAN IP address:", bullet_style))
    config_box = [[Paragraph('{\n    "server_url": "http://192.168.1.100:5000"\n}', code_style)]]
    tconf = Table(config_box, colWidths=[500])
    tconf.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(tconf)
    elements.append(Paragraph("2. Launch <b><code>start_client.bat</code></b> on the student machine.", bullet_style))
    elements.append(Paragraph("3. The client locks into full-screen mode. New students click <b>New Student Register</b>, fill Roll Number, Full Name, Username, and Password, then switch to the <b>Student Login</b> tab.", bullet_style))
    elements.append(Paragraph("4. Upon login, the screen unlocks into normal desktop view with a small floating session widget.", bullet_style))
    elements.append(Spacer(1, 12))

    # Step 3: Exam Mode
    elements.append(Paragraph("4. Step 3: Conducting Exams (Disabling Internet in Normal Mode)", h1_style))
    elements.append(Paragraph(
        "During lab examinations, instructors often need students to have normal access to local applications (IDE, Word, compilers, or local intranet exam portals) "
        "while ensuring external internet (Google, ChatGPT, web browsing) is strictly blocked.",
        body_style
    ))
    elements.append(Paragraph("• <b>To Start an Exam:</b> Click <b>'Enable Exam Mode (Block Student Internet)'</b> on the Admin Web Portal. All student PCs automatically apply Windows Firewall rules blocking web ports (80, 443) and DNS (53) while keeping LAN access to the teacher PC intact. <b>The LAB MASTER PC (Teacher Server) is strictly EXCLUDED and maintains its full internet access.</b> The student PC displays a red <code>[EXAM IN PROGRESS - NO INTERNET]</code> badge.", bullet_style))
    elements.append(Paragraph("• <b>To End the Exam:</b> Click <b>'End Exam & Restore Internet'</b>. The firewall rules are removed instantly and full student internet is restored.", bullet_style))
    elements.append(Spacer(1, 12))

    # Step 4: Logs & Password Reset
    elements.append(Paragraph("5. Step 4: System Logs & Student Password Reset", h1_style))
    elements.append(Paragraph("• <b>Password Resets:</b> Under 'Student Records', search any student by roll number or username and click <b>Reset Password</b>. The student can immediately log in on their lab PC with the new password.", bullet_style))
    elements.append(Paragraph("• <b>Audit & System Logs:</b> Every registration, successful/failed login, exam cutoff event, and shutdown is timestamped and logged. Click <b>'Export Logs (CSV)'</b> to download an Excel-ready audit file.", bullet_style))
    elements.append(Spacer(1, 12))

    # Step 5: Windows Lockdown & Removing Admin Rights
    elements.append(Paragraph("6. Step 5: Removing Student Admin Rights & Windows Lockdown", h1_style))
    elements.append(Paragraph(
        "To prevent students from bypassing the kiosk, killing tasks, or tampering with network settings, configure Windows as follows:",
        body_style
    ))
    elements.append(Paragraph("1. <b>Standard User Account:</b> Go to <i>Windows Settings &gt; Accounts &gt; Other users</i>. Create a local account named <code>Student</code> and ensure account type is set to <b>Standard User</b> (not Administrator).", bullet_style))
    elements.append(Paragraph("2. <b>Disable Task Manager:</b> Press <code>Win + R</code>, type <code>gpedit.msc</code>. Navigate to <i>User Configuration &gt; Administrative Templates &gt; System &gt; Ctrl+Alt+Del Options</i>. Set <b>Remove Task Manager</b> to <b>Enabled</b>.", bullet_style))
    elements.append(Paragraph("3. <b>Configure Auto-Start:</b> Press <code>Win + R</code>, type <code>shell:startup</code>. Create a shortcut to <code>start_client.bat</code> (or <code>client.exe</code>) inside this folder so the lock screen loads automatically on boot.", bullet_style))
    elements.append(Spacer(1, 12))

    # Step 6: Standalone Executable
    elements.append(Paragraph("7. Step 6: Compiling Standalone Executable (.exe)", h1_style))
    elements.append(Paragraph("To deploy on student PCs without needing Python installed, compile the client into a single <code>.exe</code> file:", body_style))
    
    build_box = [[Paragraph("pip install pyinstaller\ncd lab_manager\\client\npyinstaller --onefile --noconsole client.py", code_style)]]
    tb = Table(build_box, colWidths=[500])
    tb.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(tb)
    elements.append(Paragraph("Copy the generated <code>dist\\client.exe</code> and <code>client_config.json</code> to each student PC.", bullet_style))

    doc.build(elements, canvasmaker=NumberedCanvas)
    print("PDF generated successfully at:", PDF_PATH)

if __name__ == '__main__':
    build_pdf()
