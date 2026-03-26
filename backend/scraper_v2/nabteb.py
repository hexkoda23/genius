from .myschool import MySchoolScraper

class NABTEBScraper(MySchoolScraper):
    def __init__(self, headless=True):
        super().__init__(headless)
