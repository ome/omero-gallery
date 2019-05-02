const THUMB_IDS = {'project-701': 5025553, 'project-504': 4495405, 'project-754': 5514116, 'project-753': 5514054, 'project-752': 5514379,
           'project-552': 4007821, 'project-505': 4991000, 'project-503': 4496813, 'project-405': 3509516, 'project-502': 4007804,
           'project-501': 3899001, 'project-402': 3429220, 'project-404': 3430746, 'project-401': 3490890, 'project-353': 3414088,
           'project-352': 3414075, 'project-351': 3414020, 'screen-1654': 3002517, 'screen-1653': 2959817, 'screen-1901': 3261920,
           'screen-2001': 3414101, 'screen-1952': 1895788, 'project-201': 3125701, 'screen-1651': 2868079, 'project-151': 2858200,
           'screen-1652': 2892586, 'screen-1801': 3126552, 'screen-1751': 3191232, 'project-301': 3261651, 'screen-1851': 3260452,
           'project-52': 1885617, 'screen-2051': 4996332, 'project-51': 1884807, 'screen-1204': 1874776, 'screen-1203': 1851808,
           'project-101': 1919065, 'screen-1151': 1674502, 'screen-1251': 2042278, 'screen-1201': 1816624, 'screen-1302': 2858452,
           'screen-1101': 1483352, 'screen-1202': 1811248, 'screen-1603': 2857882, 'screen-1251': 2042278, 'screen-1602': 2958952,
           'screen-1601': 2857796, 'screen-1551': 2855969, 'screen-1501': 2849751, 'screen-1351': 1921252, 'screen-803': 1313418,
           'screen-251': 171248, 'screen-206': 106450, 'screen-154': 35446, 'screen-201': 95412, 'screen-253': 352577,
           'screen-751': 928389, 'screen-597': 933573, 'screen-202': 692151, 'screen-51': 13852, 'screen-102':179694, 'screen-3': 1463}

const FILTER_KEYS = ["Imaging Method", "Organism", "Publication Authors", "Publication Title",
                     "Screen Technology Type", "Screen Type", "Study Type"]

// We hard-code filtering, but could use e.g. Tags on Studies to specify Cells/Tissue
let TISSUE_STUDIES = ['idr0018', 'idr0032', 'idr0042', 'idr0043', 'idr0054'];

