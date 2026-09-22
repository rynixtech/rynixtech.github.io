import os
import sys
import json
import base64
import time
import datetime
import requests
import firebase_admin
from firebase_admin import credentials, firestore, auth

# ANSI escape codes for colors
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    RESET = '\033[0m'

def log(msg, color=Colors.RESET):
    timestamp = datetime.datetime.now().strftime('%H:%M:%S')
    print(f"{color}[{timestamp}] {msg}{Colors.RESET}")
    # Write to file for GitHub Actions artifact
    try:
        with open("brain/scan_report.txt", "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {msg}\n")
    except Exception:
        pass

class FirebaseConnector:
    def __init__(self):
        try:
            b64_creds = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
            if not b64_creds:
                raise ValueError("FIREBASE_SERVICE_ACCOUNT_JSON env var not set")
            
            creds_json = base64.b64decode(b64_creds).decode('utf-8')
            creds_dict = json.loads(creds_json)
            
            cred = credentials.Certificate(creds_dict)
            firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            log("Firebase initialized successfully", Colors.GREEN)
        except Exception as e:
            log(f"Failed to initialize Firebase: {str(e)}", Colors.RED)
            sys.exit(1)
            
    def get_collection_count(self, collection_name):
        try:
            docs = self.db.collection(collection_name).stream()
            return sum(1 for _ in docs)
        except Exception as e:
            log(f"Error getting count for {collection_name}: {str(e)}", Colors.RED)
            return 0
            
    def get_docs(self, collection_name, limit=None):
        try:
            query = self.db.collection(collection_name)
            if limit:
                query = query.limit(limit)
            return query.stream()
        except Exception as e:
            log(f"Error getting docs from {collection_name}: {str(e)}", Colors.RED)
            return []
            
    def write_doc(self, collection_name, data, doc_id=None):
        try:
            if doc_id:
                self.db.collection(collection_name).document(doc_id).set(data)
            else:
                self.db.collection(collection_name).add(data)
        except Exception as e:
            log(f"Error writing to {collection_name}: {str(e)}", Colors.RED)
            
    def update_doc(self, collection_name, doc_id, data):
        try:
            self.db.collection(collection_name).document(doc_id).update(data)
        except Exception as e:
            log(f"Error updating doc {doc_id} in {collection_name}: {str(e)}", Colors.RED)
            
    def delete_doc(self, collection_name, doc_id):
        try:
            self.db.collection(collection_name).document(doc_id).delete()
        except Exception as e:
            log(f"Error deleting doc {doc_id} in {collection_name}: {str(e)}", Colors.RED)


class BrainEventLogger:
    def __init__(self, connector):
        self.connector = connector
        
    def log_event(self, event_type, message, system, result, action=''):
        data = {
            'type': event_type,
            'message': message,
            'system': system,
            'result': result,
            'action': action,
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        self.connector.write_doc('brainEvents', data)
        
    def log_scan_start(self):
        self.log_event('info', 'System scan started', 'system_brain', 'success', 'scan_start')
        
    def log_scan_complete(self, summary):
        self.log_event('info', f'System scan completed. Issues: {summary["total_issues"]}, Fixes: {summary["total_fixes"]}', 'system_brain', 'success', 'scan_complete')


class CollectionHealthScanner:
    def __init__(self, connector):
        self.connector = connector
        self.collections = [
            'products', 'orders', 'users', 'books', 'apps', 'files', 'categories', 
            'coupons', 'reviews', 'announcements', 'banners', 'pages', 'menus', 
            'seo_settings', 'authors', 'book_categories', 'book_orders', 'downloads', 
            'ebooks', 'media_audio', 'media_categories', 'admins', 'admin_settings', 
            'customer_activity', 'notifications_settings', 'payment_settings', 
            'shipping_settings', 'store_settings', 'brainEvents', 'brainState', 
            'systemHealth', 'activityLog', 'errors', 'system_alerts', 
            'admin_notifications', 'inventory', 'app_versions', 'release_notes', 
            'security_settings', 'restore_points', 'websiteContent', 'os_releases', 
            'digital_products', 'media_store', 'shopping_store', 'analytics_data', 
            'returns', 'storage_stats', 'support'
        ]
        
    def scan(self):
        stats = {}
        warnings = []
        errors = []
        
        for coll in self.collections:
            try:
                docs = list(self.connector.get_docs(coll))
                count = len(docs)
                stats[coll] = count
                if count == 0:
                    warnings.append(f"Collection '{coll}' is empty")
                    continue
                    
                # Required field checks & Anomaly detection
                for doc in docs:
                    data = doc.to_dict()
                    if not data:
                        continue
                        
                    doc_id = doc.id
                    
                    if coll == 'products':
                        if not all(k in data for k in ['name', 'price', 'status', 'createdAt']):
                            errors.append(f"Product {doc_id} missing required fields")
                        if data.get('price', 0) < 0:
                            errors.append(f"Product {doc_id} has negative price")
                        if data.get('stock', 0) < 0:
                            errors.append(f"Product {doc_id} has negative stock")
                            
                    elif coll == 'orders':
                        if not all(k in data for k in ['userId', 'items', 'amount', 'status', 'createdAt']):
                            errors.append(f"Order {doc_id} missing required fields")
                        if data.get('amount', 0) == 0:
                            warnings.append(f"Order {doc_id} has zero amount")
                            
                    elif coll == 'users':
                        if not all(k in data for k in ['email', 'uid', 'createdAt']):
                            errors.append(f"User {doc_id} missing required fields")
                            
                    elif coll == 'books':
                        if not all(k in data for k in ['title', 'status']):
                            errors.append(f"Book {doc_id} missing required fields")
                            
                    elif coll == 'apps':
                        if 'name' not in data:
                            errors.append(f"App {doc_id} missing required fields")
                            
                    elif coll == 'coupons':
                        if not all(k in data for k in ['code', 'discountType', 'discountValue', 'active']):
                            errors.append(f"Coupon {doc_id} missing required fields")
                        active = data.get('active')
                        expires_at = data.get('expiresAt')
                        if active and expires_at:
                            if isinstance(expires_at, datetime.datetime) and expires_at.replace(tzinfo=datetime.timezone.utc) < datetime.datetime.now(datetime.timezone.utc):
                                warnings.append(f"Coupon {doc_id} is active but past expiry")
                            
                    elif coll == 'announcements':
                        if not all(k in data for k in ['title', 'message']):
                            errors.append(f"Announcement {doc_id} missing required fields")
                            
                    elif coll == 'reviews':
                        rating = data.get('rating', 0)
                        if rating < 1 or rating > 5:
                            errors.append(f"Review {doc_id} has invalid rating: {rating}")
                            
            except Exception as e:
                errors.append(f"Failed to scan collection {coll}: {str(e)}")
                
        return {'stats': stats, 'warnings': warnings, 'errors': errors}


class DataIntegrityScanner:
    def __init__(self, connector):
        self.connector = connector
        
    def scan(self):
        issues = []
        try:
            users_docs = {doc.id for doc in self.connector.get_docs('users')}
            products_docs = {doc.id for doc in self.connector.get_docs('products')}
            books_docs = {doc.id for doc in self.connector.get_docs('books')}
            
            # Orphaned orders
            orders = list(self.connector.get_docs('orders'))
            for order in orders:
                data = order.to_dict() or {}
                if data.get('userId') not in users_docs:
                    issues.append(f"Orphaned order {order.id}: references non-existent user")
                    
                status = data.get('status')
                created_at = data.get('createdAt')
                if status == 'pending' and isinstance(created_at, datetime.datetime):
                    if (datetime.datetime.now(datetime.timezone.utc) - created_at.replace(tzinfo=datetime.timezone.utc)).days > 7:
                        issues.append(f"Stale pending order {order.id} (> 7 days old)")

            # Orphaned reviews
            reviews = list(self.connector.get_docs('reviews'))
            for review in reviews:
                data = review.to_dict() or {}
                if data.get('productId') not in products_docs:
                    issues.append(f"Orphaned review {review.id}: references non-existent product")
                    
            # Orphaned book_orders
            book_orders = list(self.connector.get_docs('book_orders'))
            for bo in book_orders:
                data = bo.to_dict() or {}
                book_id = data.get('bookId')
                if book_id and book_id not in books_docs:
                    issues.append(f"Orphaned book_order {bo.id}: references non-existent book {book_id}")

            # Duplicates
            coupons = list(self.connector.get_docs('coupons'))
            seen_codes = set()
            for coupon in coupons:
                code = (coupon.to_dict() or {}).get('code')
                if code:
                    if code in seen_codes:
                        issues.append(f"Duplicate coupon code found: {code}")
                    seen_codes.add(code)
                    
            products = list(self.connector.get_docs('products'))
            seen_names = set()
            for product in products:
                name = (product.to_dict() or {}).get('name')
                if name:
                    if name in seen_names:
                        issues.append(f"Duplicate product name found: {name}")
                    seen_names.add(name)

        except Exception as e:
            issues.append(f"DataIntegrityScanner failed: {str(e)}")
            
        return issues


class ServiceHealthChecker:
    def __init__(self, connector):
        self.connector = connector
        
    def check(self):
        status = {}
        
        # 1. Cloudflare Worker
        try:
            r = requests.get('https://rynixtech-github-io.rynixtech.workers.dev/', timeout=10)
            if r.status_code in (200, 404):
                status['cloudflare_worker'] = 'UP'
            else:
                status['cloudflare_worker'] = f'DOWN (HTTP {r.status_code})'
        except Exception as e:
            status['cloudflare_worker'] = f'DOWN ({str(e)})'
            
        # 2. Website
        try:
            r = requests.get('https://rynixtech.github.io/', timeout=10)
            if r.status_code == 200:
                status['website'] = 'UP'
            else:
                status['website'] = f'DOWN (HTTP {r.status_code})'
        except Exception as e:
            status['website'] = f'DOWN ({str(e)})'
            
        # 3. Firebase Auth
        try:
            auth.list_users(max_results=1)
            status['firebase_auth'] = 'UP'
        except Exception as e:
            status['firebase_auth'] = f'DOWN ({str(e)})'
            
        # 4. Firestore
        try:
            list(self.connector.get_docs('brainState', limit=1))
            status['firestore'] = 'UP'
        except Exception as e:
            status['firestore'] = f'DOWN ({str(e)})'
            
        return status


class AutoFixer:
    def __init__(self, connector, logger):
        self.connector = connector
        self.logger = logger
        self.fixes_applied = 0
        
    def run(self):
        self.fixes_applied = 0
        skip = os.environ.get('SKIP_AUTOFIX', 'false').lower() == 'true'
        if skip:
            log("Auto-fix skipped via environment variable.", Colors.YELLOW)
            return 0
            
        try:
            # 1. Expire old coupons
            for doc in self.connector.get_docs('coupons'):
                data = doc.to_dict() or {}
                if data.get('active'):
                    expires_at = data.get('expiresAt')
                    if isinstance(expires_at, datetime.datetime) and expires_at.replace(tzinfo=datetime.timezone.utc) < datetime.datetime.now(datetime.timezone.utc):
                        self.logger.log_event('info', f"Auto-fixing coupon {doc.id}: Expiring old coupon", 'auto_fixer', 'pending')
                        try:
                            self.connector.update_doc('coupons', doc.id, {'active': False})
                            self.logger.log_event('info', f"Successfully expired coupon {doc.id}", 'auto_fixer', 'success')
                            self.fixes_applied += 1
                        except Exception as e:
                            self.logger.log_event('error', f"Failed to expire coupon {doc.id}: {str(e)}", 'auto_fixer', 'failure')
                            
            # 2. Flag stale orders
            for doc in self.connector.get_docs('orders'):
                data = doc.to_dict() or {}
                if data.get('status') == 'pending':
                    created_at = data.get('createdAt')
                    if isinstance(created_at, datetime.datetime) and (datetime.datetime.now(datetime.timezone.utc) - created_at.replace(tzinfo=datetime.timezone.utc)).days > 7:
                        self.logger.log_event('info', f"Auto-fixing order {doc.id}: Flagging as stale", 'auto_fixer', 'pending')
                        try:
                            self.connector.update_doc('orders', doc.id, {'status': 'stale'})
                            self.logger.log_event('info', f"Successfully flagged order {doc.id} as stale", 'auto_fixer', 'success')
                            self.fixes_applied += 1
                        except Exception as e:
                            self.logger.log_event('error', f"Failed to flag order {doc.id}: {str(e)}", 'auto_fixer', 'failure')
                            
            # 3. Deactivate stock-out products
            for doc in self.connector.get_docs('products'):
                data = doc.to_dict() or {}
                if data.get('stock') == 0 and data.get('status') == 'active':
                    self.logger.log_event('info', f"Auto-fixing product {doc.id}: Setting to out_of_stock", 'auto_fixer', 'pending')
                    try:
                        self.connector.update_doc('products', doc.id, {'status': 'out_of_stock'})
                        self.logger.log_event('info', f"Successfully deactivated product {doc.id}", 'auto_fixer', 'success')
                        self.fixes_applied += 1
                    except Exception as e:
                        self.logger.log_event('error', f"Failed to deactivate product {doc.id}: {str(e)}", 'auto_fixer', 'failure')
                        
            # 4. Clean old activity logs
            for doc in self.connector.get_docs('customer_activity'):
                data = doc.to_dict() or {}
                created_at = data.get('createdAt')
                if isinstance(created_at, datetime.datetime) and (datetime.datetime.now(datetime.timezone.utc) - created_at.replace(tzinfo=datetime.timezone.utc)).days > 90:
                    self.logger.log_event('info', f"Auto-fixing activity log {doc.id}: Deleting old log", 'auto_fixer', 'pending')
                    try:
                        self.connector.delete_doc('customer_activity', doc.id)
                        self.logger.log_event('info', f"Successfully deleted activity log {doc.id}", 'auto_fixer', 'success')
                        self.fixes_applied += 1
                    except Exception as e:
                        self.logger.log_event('error', f"Failed to delete activity log {doc.id}: {str(e)}", 'auto_fixer', 'failure')
                        
        except Exception as e:
            log(f"AutoFixer encountered an error: {str(e)}", Colors.RED)
            
        return self.fixes_applied


if __name__ == '__main__':
    # Initialize report file
    os.makedirs('brain', exist_ok=True)
    with open('brain/scan_report.txt', 'w', encoding='utf-8') as f:
        f.write('')
        
    print(f"{Colors.GREEN}=== RYNIX TECH SYSTEM BRAIN v1.0 ==={Colors.RESET}")
    start_time = time.time()
    
    connector = FirebaseConnector()
    logger = BrainEventLogger(connector)
    logger.log_scan_start()
    
    # 1. ServiceHealthChecker
    log("Running Service Health Checker...", Colors.YELLOW)
    health_checker = ServiceHealthChecker(connector)
    service_status = health_checker.check()
    for svc, status in service_status.items():
        color = Colors.GREEN if 'UP' in status else Colors.RED
        log(f"Service {svc}: {status}", color)
        
    # 2. CollectionHealthScanner
    log("Running Collection Health Scanner...", Colors.YELLOW)
    collection_scanner = CollectionHealthScanner(connector)
    collection_health = collection_scanner.scan()
    for w in collection_health['warnings']:
        log(w, Colors.YELLOW)
    for e in collection_health['errors']:
        log(e, Colors.RED)
        
    # 3. DataIntegrityScanner
    log("Running Data Integrity Scanner...", Colors.YELLOW)
    integrity_scanner = DataIntegrityScanner(connector)
    integrity_issues = integrity_scanner.scan()
    for i in integrity_issues:
        log(i, Colors.RED)
        
    # 4. AutoFixer
    log("Running Auto Fixer...", Colors.YELLOW)
    autofixer = AutoFixer(connector, logger)
    fixes_count = autofixer.run()
    log(f"Auto-fixes applied: {fixes_count}", Colors.GREEN)
    
    # Summary
    scan_duration = time.time() - start_time
    total_issues = len(collection_health['warnings']) + len(collection_health['errors']) + len(integrity_issues)
    
    summary = {
        'total_issues': total_issues,
        'total_fixes': fixes_count,
        'service_status': service_status,
        'scan_duration_seconds': scan_duration,
        'timestamp': datetime.datetime.now(datetime.timezone.utc)
    }
    
    # Write summary
    connector.write_doc('systemHealth', summary, 'latest_scan')
    connector.write_doc('systemHealth', summary, f'scan_{int(start_time)}')
    
    logger.log_scan_complete(summary)
    
    log("=== SCAN COMPLETE ===", Colors.GREEN)
    log(f"Duration: {scan_duration:.2f}s", Colors.RESET)
    log(f"Total Issues Found: {total_issues}", Colors.YELLOW if total_issues > 0 else Colors.GREEN)
    log(f"Total Fixes Applied: {fixes_count}", Colors.GREEN)
    
    if len(collection_health['errors']) > 0 or any('DOWN' in status for status in service_status.values()):
        log("Critical issues found during scan.", Colors.RED)
        sys.exit(1)
    else:
        sys.exit(0)
