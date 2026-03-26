from .myschool import MySchoolScraper

class WAECScraper(MySchoolScraper):
    def __init__(self, headless=True):
        super().__init__(headless)
