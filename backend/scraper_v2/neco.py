from .myschool import MySchoolScraper

class NECOScraper(MySchoolScraper):
    def __init__(self, headless=True):
        super().__init__(headless)
