import os

css_content = """
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:host {
  display: block;
  height: 100vh;
}

.sidebar-container {
  width: 260px;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  color: #64748b;
  position: sticky;
  top: 0;
}

.sidebar-brand {
  padding: 32px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.sidebar-brand .brand-logo {
  background: #2563eb;
  color: white;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
}
.sidebar-brand .brand-text {
  font-weight: 700;
  color: #1e293b;
  font-size: 18px;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
  gap: 4px;
}
.sidebar-nav .nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
}
.sidebar-nav .nav-link i {
  font-size: 18px;
}
.sidebar-nav .nav-link:hover {
  background: #f8fafc;
  color: #2563eb;
}
.sidebar-nav .nav-link.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}
.sidebar-nav .nav-spacer {
  flex: 1;
}

.sidebar-footer {
  padding: 24px 16px;
  border-top: 1px solid #f1f5f9;
}
.sidebar-footer .user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
}
.sidebar-footer .user-info .user-avatar {
  width: 40px;
  height: 40px;
  background: #f1f5f9;
  color: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.sidebar-footer .user-info .user-details {
  display: flex;
  flex-direction: column;
}
.sidebar-footer .user-info .user-details .user-name {
  color: #1e293b;
  font-weight: 600;
  font-size: 14px;
}
.sidebar-footer .user-info .user-details .user-status {
  color: #10b981;
  font-size: 12px;
}
"""

files = [
    "c:/Users/USER/Desktop/PROJET_302/MAKETS_deseign/Client and User Dashboards – Figma Make_files/greenfront/src/app/components/admin/dashboard-admin/dashboard-admin.scss",
    "c:/Users/USER/Desktop/PROJET_302/MAKETS_deseign/Client and User Dashboards – Figma Make_files/greenfront/src/app/components/client/mesprojet/mesprojet.scss",
    "c:/Users/USER/Desktop/PROJET_302/MAKETS_deseign/Client and User Dashboards – Figma Make_files/greenfront/src/app/components/client/createprojetform/createprojetform.scss",
    "c:/Users/USER/Desktop/PROJET_302/MAKETS_deseign/Client and User Dashboards – Figma Make_files/greenfront/src/app/components/header/header.scss",
    "c:/Users/USER/Desktop/PROJET_302/MAKETS_deseign/Client and User Dashboards – Figma Make_files/greenfront/src/app/components/client/client.scss",
    "c:/Users/USER/Desktop/PROJET_302/MAKETS_deseign/Client and User Dashboards – Figma Make_files/greenfront/src/app/components/utilisateurs/utilisateurs.scss"
]

for file in files:
    if os.path.exists(file):
        with open(file, "a") as f:
            f.write("\n" + css_content + "\n")
        print(f"Appended to {file}")
