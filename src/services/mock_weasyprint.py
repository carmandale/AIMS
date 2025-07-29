"""Mock WeasyPrint implementation for testing when system dependencies aren't available"""

class MockHTML:
    """Mock HTML class for WeasyPrint compatibility"""
    
    def __init__(self, string=None, filename=None, url=None):
        self.content = string or ""
    
    def write_pdf(self, target, stylesheets=None):
        """Mock PDF writing - creates a dummy file"""
        with open(target, 'w') as f:
            f.write(f"Mock PDF content\n{self.content[:200]}...")


class MockCSS:
    """Mock CSS class for WeasyPrint compatibility"""
    
    def __init__(self, string=None, filename=None, url=None):
        self.content = string or ""


# Mock exports that match WeasyPrint API
HTML = MockHTML
CSS = MockCSS