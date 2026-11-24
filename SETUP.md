# Firebase leaderboard setup
1. console.firebase.google.com > Add project > Firestore Database > Create (production mode).
2. Project settings > Your apps > Web (</>) > copy projectId and apiKey into FB in index.html.
3. Firestore > Rules, paste and Publish:
rules_version='2';
service cloud.firestore { match /databases/{db}/documents {
  match /{col}/{uid} {
    allow read: if col.matches('lb_.*');
    allow create: if col.matches('lb_.*') && request.resource.data.keys().hasOnly(['name','score'])
      && request.resource.data.score is int && request.resource.data.score>=0 && request.resource.data.score<=1000
      && request.resource.data.name is string && request.resource.data.name.size()<=12;
    allow update: if col.matches('lb_.*') && request.resource.data.keys().hasOnly(['name','score'])
      && request.resource.data.score is int && request.resource.data.score>=resource.data.score && request.resource.data.score<=1000
      && request.resource.data.name is string && request.resource.data.name.size()<=12;
  }}}
4. Project settings > API key restrictions (Google Cloud) > restrict to your github.io domain.
