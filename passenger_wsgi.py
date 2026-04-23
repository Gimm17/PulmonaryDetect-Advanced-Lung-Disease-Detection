import imp
import os
import sys

# Uncomment and modify this if you need to specify a specific Python version
# INTERP = "/home/USERNAME/virtualenv/LungDiseaseDetection/3.9/bin/python"
# if sys.executable != INTERP:
#     os.execl(INTERP, INTERP, *sys.argv)

sys.path.insert(0, os.path.dirname(__file__))

# Load the WSGI application
from wsgi import application