import unittest
from prepare import prepare

class AnalyticsTest(unittest.TestCase):
    def payload(self):
        return {'today':'2026-10-01','days':7,'data':{'subjects':[{'id':'a','name':'A'},{'id':'b','name':'B'}],'sessions':[{'subjectId':'a','date':'2026-09-25','minutes':30},{'subjectId':'a','date':'2026-10-01','minutes':60},{'subjectId':'b','date':'2026-10-01','minutes':15},{'subjectId':'a','date':'2026-09-24','minutes':50},{'subjectId':'a','date':'2026-10-02','minutes':100}],'tasks':[{'subjectId':'a','due':'2026-09-30','done':False,'priority':'urgente','estimatedMinutes':40},{'subjectId':'b','due':'2026-10-02','done':True,'completedAt':'2026-10-01'},{'subjectId':'a','due':'2026-10-01','done':True,'completedAt':'2026-09-10'},{'subjectId':'a','due':'2026-09-20','done':False,'status':'CANCELLED','priority':'alta'}]}}
    def test_totals_periods_and_actual_completion(self):
        m=prepare(self.payload())
        self.assertEqual(m['minutes'],105)
        self.assertEqual(m['previousMinutes'],50)
        self.assertEqual(m['activeDays'],2)
        self.assertEqual(m['completed'],1)
        self.assertEqual(m['pending'],1)
        self.assertEqual(m['overdue'],1)
        self.assertEqual(m['urgent'],1)
        self.assertEqual(m['estimatedMinutes'],40)
        self.assertEqual(len(m['daily']),7)
    def test_subject_filter(self):
        payload=self.payload();payload['subject']='b'
        m=prepare(payload)
        self.assertEqual(m['minutes'],15)
        self.assertIsNone(m['changePercent'])
        self.assertEqual(len(m['subjects']),1)
    def test_empty(self):
        payload=self.payload();payload['data']['sessions']=[];payload['data']['tasks']=[]
        m=prepare(payload)
        self.assertEqual(m['minutes'],0)
        self.assertEqual(m['averageSession'],0)
        self.assertIsNone(m['changePercent'])

if __name__=='__main__':unittest.main()
