(function(root){
  const resources={
    arrays:{title:'JavaScript arrays',provider:'MDN',url:'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Arrays',access:'Free reading · no signup needed',prerequisite:'Start with basic JavaScript variables, numbers, and functions.'},
    collections:{title:'Indexed collections',provider:'MDN',url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections',access:'Free reading · no signup needed',prerequisite:'Familiarity with JavaScript arrays and loops.'},
    networking:{title:'Networking Basics',provider:'Cisco Networking Academy',url:'https://www.netacad.com/courses/networking-basics',access:'Free course · enrollment may require an account',prerequisite:'Start with basic computer use; use a simulator or paper diagram for your practice.'},
    security:{title:'Introduction to Cybersecurity',provider:'Cisco Networking Academy',url:'https://www.netacad.com/courses/introduction-to-cybersecurity',access:'Free course · enrollment may require an account',prerequisite:'No previous security practice is needed for the introductory course.'},
    authorization:{title:'Authorization guidance',provider:'OWASP',url:'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html',access:'Free reading · no signup needed',prerequisite:'Understand users, permissions, and basic web application behavior.'},
    python:{title:'Python',provider:'Kaggle Learn',url:'https://www.kaggle.com/learn/python',access:'Free course · an account may be needed for exercises',prerequisite:'Use this introduction before pandas if Python is new to you.'},
    pandas:{title:'Pandas',provider:'Kaggle Learn',url:'https://www.kaggle.com/learn/pandas',access:'Free course · an account may be needed for exercises',prerequisite:'Basic Python programming.'},
    missing:{title:'Working with missing data',provider:'pandas documentation',url:'https://pandas.pydata.org/docs/user_guide/missing_data.html',access:'Free reading · no signup needed',prerequisite:'Basic Python and pandas DataFrames.'},
    sql:{title:'Interactive SQL lessons',provider:'SQLBolt',url:'https://sqlbolt.com/',access:'Free browser lessons · no signup needed',prerequisite:'Start with SELECT before moving to grouping and aggregates.'},
    select:{title:'SQLite SELECT reference',provider:'SQLite',url:'https://www.sqlite.org/lang_select.html',access:'Free reading · no signup needed',prerequisite:'Familiarity with SELECT, filtering, grouping, and a local SQLite database.'},
    accessibility:{title:'Learn Accessibility',provider:'web.dev',url:'https://web.dev/learn/accessibility',access:'Free reading · no signup needed',prerequisite:'Basic HTML; review native form elements before the exercise.'},
    forms:{title:'Accessible forms tutorial',provider:'W3C Web Accessibility Initiative',url:'https://www.w3.org/WAI/tutorials/forms/',access:'Free reading · no signup needed',prerequisite:'Basic HTML form structure.'}
  };
  const catalog={
    'Software Development':{resources:['arrays','arrays','collections'],topic:'arrays, missing values, and zero handling',activities:[
      'Follow an array example, then summarize three numeric values. Add a zero and a missing value and explain the difference.',
      'Build the score-summary tool. Test normal, empty, missing, zero, and fractional inputs and explain one bug you fixed.',
      'Implement the tool without a supplied solution. Create your own edge-case tests and compare two implementations for correctness and readability.'
    ]},
    'Networking':{resources:['networking','networking','networking'],topic:'IPv4 configuration and troubleshooting',activities:[
      'On paper or in a simulator, label the PC address, subnet mask, gateway, and DNS. Follow a worked setup and explain each field.',
      'Configure a simulated lab PC, then introduce a wrong gateway and a wrong DNS setting separately. Record the checks that isolate each fault.',
      'Design a small simulated network and a diagnostic checklist without a supplied configuration. Test several faults and document recovery evidence.'
    ]},
    'Cybersecurity':{resources:['security','authorization','authorization'],topic:'permissions and access-control checks',activities:[
      'Learn what authentication and authorization mean. Build a simple permission table for students and researchers in a fictional application.',
      'Review access rules in an authorized practice lab. Test another user’s records and submitted records, and document the expected denial.',
      'Design an access-control test matrix for your own authorized local app. Include ownership, role, record state, and denied-action tests.'
    ]},
    'Data Science and Analytics':{resources:['python','pandas','missing'],topic:'data cleaning, missing values, and reliable summaries',activities:[
      'Complete introductory Python exercises, then inspect a small table. Identify duplicates, missing entries, and real zeros before calculating a summary.',
      'Clean a small dataset in pandas. Show before-and-after rows and explain how duplicate and missing-value decisions change the summary.',
      'Choose a dataset, document a cleaning policy, and compare alternative missing-value decisions. Explain the effect on your findings and their limitations.'
    ]},
    'Database Administration':{resources:['sql','sql','select'],topic:'SELECT, grouping, totals, and thresholds',activities:[
      'Complete introductory SELECT and filtering exercises, then calculate a simple grouped total using the lesson examples.',
      'Create a local Orders table. Group by customer and test totals below, at, and above a threshold, including ties.',
      'Design a small local reporting database and write a grouped report without a supplied query. Add fixtures for empty data, ties, and threshold cases.'
    ]},
    'UI/UX and Web Development':{resources:['accessibility','forms','forms'],topic:'accessible forms and keyboard use',activities:[
      'Review native inputs, labels, and buttons. Build a small form from the tutorial and check that every field has a meaningful label.',
      'Build and test an accessible form. Check keyboard use and ask a peer to complete the task without your guidance.',
      'Design a form independently, test keyboard and error-recovery behavior, and document a usability issue and the change you made after testing.'
    ]}
  };
  function recommend(career,row){
    if(!catalog[career])throw Error('Unknown learning career.');
    const parts=[['practical',4],['written',4],['knowledge',6]];
    const complete=parts.every(([name,max])=>row?.[name]&&row[name].maximum===max&&row[name].graded===row[name].total&&row[name].total===(name==='knowledge'?6:1)&&Number.isInteger(row[name].points)&&row[name].points>=0&&row[name].points<=max);
    const points=complete?parts.reduce((sum,[name])=>sum+row[name].points,0):null;
    const tier=points===null?null:points<=5?0:points<=10?1:2;
    const labels=['Foundations','Build your skills','Explore a challenge'];
    const weakest=complete&&points<14?[...parts].sort(([a,am],[b,bm])=>row[a].points/am-row[b].points/bm)[0][0]:null;
    const focus={knowledge:'Review the key concepts before starting the activity.',practical:'Prioritize hands-on practice and check your work with test cases.',written:'Explain your decisions and the expected results of your checks.'};
    const entry=catalog[career],resource=resources[entry.resources[tier??0]];
    return {version:'learning-start-v1',career,points,tier,label:tier===null?'Awaiting scores':labels[tier],weakest,focus:weakest?focus[weakest]:complete?'Extend your practice with a less-guided project and document your test cases.':'Your learning starting point will appear when all three components are graded.',resource,topic:entry.topic,activity:entry.activities[tier??0],checkedAt:'2026-10-13'};
  }
  const api={version:'learning-start-v1',resources,catalog,recommend};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.NorthStarLearning=api;
})(typeof window!=='undefined'?window:null);
