from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from auth_app.models import Company

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a superuser with custom User model'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Superuser email')
        parser.add_argument('--password', type=str, required=True, help='Superuser password')
        parser.add_argument('--first-name', type=str, required=True, help='Superuser first name')
        parser.add_argument('--last-name', type=str, required=True, help='Superuser last name')
        parser.add_argument('--company-name', type=str, default='Kampas Developer Company', help='Company name')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']
        company_name = options['company_name']

        # Create or get developer company
        company, created = Company.objects.get_or_create(
            name=company_name,

        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created company: {company.name}')
            )

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.ERROR(f'User with email {email} already exists')
            )
            return

        # Create superuser
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            company=company,
            role='super_user',
            is_email_verified=True,
            is_approved=True,
            is_active=True,
            is_staff=True,
            is_superuser=True
        )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created superuser: {user.email}')
        ) 