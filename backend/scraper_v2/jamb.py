from .myschool import MySchoolScraper

class JAMBScraper(MySchoolScraper):
    def __init__(self, headless=True):
        super().__init__(headless)
