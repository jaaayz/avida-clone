import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { BackendServiceService } from 'src/app/services/backend-service.service';
import { Observable, catchError, forkJoin, switchMap, map, of } from 'rxjs';
import { FileUploadModule } from 'primeng/fileupload';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { ImageModule } from 'primeng/image';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ToastModule } from 'primeng/toast';
interface UploadEvent {
  originalEvent: Event;
  files: File[];
}

interface AutoCompleteCompleteEvent {
  originalEvent: Event;
  query: string;
}
interface Tenant {
  id: any;
  user_id: number;
  first_name: string;
  last_name: string;
}


@Component({
  selector: 'app-tenant-lease',
  standalone: true,
  imports: [TableModule, FileUploadModule, CommonModule, InputNumberModule, FormsModule, 
            ImageModule, CalendarModule, ButtonModule, RippleModule, DialogModule, AutoCompleteModule, ToastModule],
  templateUrl: './tenant-lease.component.html',
  styleUrls: ['./tenant-lease.component.scss']
})

export class TenantLeaseComponent implements OnInit {
  uploadedFile: any;
  fileName: string | undefined;
  imageSrc: any;
  leases: any[] = [];
  selectedItem: any;
  updatedMonthlyRents: { [leaseId: number]: number } = {};
  // date: Date | undefined;
  date: Date[] | undefined;
  today: Date;
  numberOfMonths: number | null = null;
  computedEndDates: { [leaseId: number]: string } = {};
  visible: boolean = false;
  // items: any[] | undefined;
  // suggestions: any[] = [];
  // selectedTenants: any = null;
  // selectedTenant: any;
  tenants: Tenant[] = [];
  suggestions: Tenant[] = [];
  selectedTenants: Tenant[] = [];
  units: any[] = [];
  selectedTenant: Tenant | null = null; 
  filteredTenants: Tenant[] = [];
  newDialogVisible: boolean = false;
  loggedUser: any;
  
  constructor(private backendService: BackendServiceService, private messageService: MessageService) {
    this.today = new Date();
   
  }
  onUpload(event: UploadEvent) {
    this.messageService.add({ severity: 'info', summary: 'Success', detail: 'File Uploaded with Basic Mode' });
}
  showDialog() {
    this.visible = true;
  }

  ngOnInit(): void {
    // this.getLease();
    const storedLeases = localStorage.getItem('leases');
    if (storedLeases) {
      this.leases = JSON.parse(storedLeases);
    }
    if (this.leases.length > 0) {
      this.selectedItem = this.leases[0];
    }

    this.leases.forEach(lease => lease.numberOfMonths = 1);
    // this.fetchLoggedInUser();
  }

  search(event: AutoCompleteCompleteEvent) {
    const tenantQuery = event.query;
    console.log('Search query:', tenantQuery);
  
    const email = this.backendService.getEmail();
    console.log('Logged-in user email:', email);
  
    this.backendService.getUser(email).subscribe({
        next: (currentUser: { units: Array<{ tower_number: string, floor_number: string, unit_number: string }> }) => {
        console.log('Current user details:', currentUser); 
  
          
    this.backendService.getUsers().subscribe({
    next: (response: any) => {
    let tenants = [];
    if (Array.isArray(response)) {
        tenants = response;
      }

        const filteredTenants = tenants.filter((user: { user_type: string; units: Array<{ tower_number: string, floor_number: string, unit_number: string }> }) => {
        return user.user_type === 'TENANT' &&
          user.units.some(unit => 
          unit.tower_number === currentUser.units[0].tower_number &&
          unit.floor_number === currentUser.units[0].floor_number &&
          unit.unit_number === currentUser.units[0].unit_number
          );
          });
                    
          console.log('Filtered tenants by unit details:', filteredTenants); 
  
          filteredTenants.forEach((tenant: { first_name: string; last_name: string; fullName?: string }) => {
          tenant.fullName = `${tenant.first_name} ${tenant.last_name}`;
          });
  
          this.suggestions = filteredTenants.filter((user: { fullName: string }) =>
          user.fullName.toLowerCase().includes(tenantQuery.toLowerCase())
          );
  
          console.log('Filtered suggestions:', this.suggestions); 
          },
          error: (error) => {
          console.error('Error fetching tenants:', error);
          this.suggestions = [];
          }
          });
        },
        error: (error) => {
            console.error('Error fetching current user details:', error);
            this.suggestions = [];
        }
    });
}

// onTenantSelected(event: any) {
//   this.visible = false; // Close the search dialog
//   const selectedTenant: Tenant = event.value;

//   if (!this.selectedTenants.some(tenant => tenant.id === selectedTenant.id)) {
//     this.selectedTenants.push(selectedTenant);
//   }

//   this.backendService.getLease(selectedTenant.id).subscribe({
//       next: (leaseDetails: any) => {
//         if (leaseDetails && leaseDetails.lease_agreement_id) {
//           this.backendService
//             .updateLease(leaseDetails.lease_agreement_id, {
//               owner_id: this.loggedUser.owner_id,
//             })
//             .subscribe({
//               next: (response) => {
//                 console.log('Lease agreement updated successfully', response);
//               },
//               error: (error) => {
//                 console.error('Error updating lease agreement', error);
//               },
//             });
//         } else {
//           console.error('No valid lease agreement found for selected tenant.');
//         }
//       },
//     error: error => {
//       console.error('Failed to fetch lease agreement:', error);
//     }
//   });

//   this.selectedTenant = null;
//   this.newDialogVisible = true;
// }

  onTenantSelected(event: any) {
    this.visible = false; // Close the search dialog
    const selectedTenant: Tenant = event.value;
    console.log('Tenant selected:', selectedTenant);
  
    if (!this.selectedTenants.some(tenant => tenant.user_id === selectedTenant.user_id)) {
      this.selectedTenants.push(selectedTenant);
    }
    this.selectedTenant = null;
    this.newDialogVisible = true; 
    
  }

updateLeaseAgreement(leaseAgreementId: number) {
  if (!this.loggedUser || !this.loggedUser.owner_id) {
      console.error('No logged-in user data available.');
      return; 
  }

  console.log('Current logged-in user\'s owner_id:', this.loggedUser.owner_id);

  const data = {
      owner_id: this.loggedUser.owner_id
  };

  this.backendService.updateLease(leaseAgreementId, data).subscribe({
      next: response => {
          console.log('Lease agreement updated successfully', response);
      },
      error: error => {
          console.error('Error updating lease agreement', error);
      }
  });
}


  // getLease(): void {
  //   const email = this.backendService.getEmail();
  //   this.backendService.getUser(email).subscribe({
  //     next: (userData) => {
  //       const leases: any[] = [];

  //       if (userData.lease_agreements && Array.isArray(userData.lease_agreements)) {
  //         userData.lease_agreements.forEach((leaseAgreement: any) => {
  //           const tenantEmail = leaseAgreement.tenant_info.email;
  //           this.backendService.getUser(tenantEmail).subscribe({
  //             next: (tenantData) => {
  //               const leaseInfo = {
  //                 lease_agreement_id: leaseAgreement.lease_agreement_id,
  //                 unit_id: leaseAgreement.unit_id,
  //                 owner_id: leaseAgreement.owner_id,
  //                 tenant_id: leaseAgreement.tenant_id,
  //                 start_date: leaseAgreement.start_date,
  //                 end_date: leaseAgreement.end_date,
  //                 monthly_rent: leaseAgreement.monthly_rent,
  //                 remaining_balance: leaseAgreement.remaining_balance,
  //                 security_deposit: leaseAgreement.security_deposit,
  //                 contract: leaseAgreement.contract,
  //                 tenant_info: {
  //                   first_name: tenantData.first_name,
  //                   last_name: tenantData.last_name,
  //                   email: tenantData.email,
  //                 },
  //                 startDateSaved: false,
  //                 disabledInput: false,
  //                 updatedMonthlyRent: null, // Initialize with the current monthly rent
  //               };
  //               leases.push(leaseInfo);
  //               console.log('Lease added:', leaseInfo);
  //             },
  //             error: (error) => {
  //               console.error('Error fetching tenant data:', error);
  //             }
  //           });
  //         });
  //       } else {
  //         console.error('Lease agreements data not found or invalid.');
  //       }
  //       this.leases = leases;

  //       if (this.leases.length > 0) {
  //         this.selectedItem = this.leases[0];
  //         console.log(this.selectedItem);
  //       } else {
          
  //       }
  //     },
  //     error: (error) => {
  //       console.error('Error fetching user data:', error);
  //     }
  //   });
  // }

  async storeImageData(event: any, lease_agreement_id: number) {
    console.log(lease_agreement_id);
    this.uploadedFile = event.files[0];
    this.fileName = this.uploadedFile.name;

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      this.imageSrc = e.target.result;

      const formData = new FormData();
      formData.append('file', this.uploadedFile);

      try {
        const response = await this.backendService.uploadImageToLease(formData, lease_agreement_id);
        console.log('Image uploaded to lease agreement successfully:', response);
      } catch (error) {
        console.error('Error uploading image to lease agreement:', error);
      }
    };
    reader.readAsDataURL(event.files[0]);
  }

  updateRent(lease: any): void {
    if (lease.updatedMonthlyRent !== null && lease.updatedMonthlyRent !== undefined) {
      if (lease.updatedMonthlyRent >= 0) { // Change this condition to allow any positive value
        const remainingBalanceAfterRent = lease.remaining_balance - lease.updatedMonthlyRent;
        lease.remaining_balance = remainingBalanceAfterRent;
        console.log('Remaining balance:', lease.remaining_balance);
  
        const email = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}').email;
        if (email) {
          this.backendService.getUser(email).subscribe({
            next: (userData: any) => {
              const ownerId = userData.owner_id || userData.user_id;
              console.log('owner id:', ownerId);
  
              if (ownerId) {
                const leaseData = {
                  lease_agreement_id: lease.lease_agreement_id,
                  unit_id: lease.unit_id,
                  owner_id: ownerId,
                  tenant_id: lease.tenant_id,
                  contract: lease.contract || '',
                  start_date: this.getFormattedDate(lease.start_date),
                  end_date: lease.end_date,
                  monthly_rent: lease.updatedMonthlyRent, // Use the updated monthly rent
                  security_deposit: lease.security_deposit,
                  remaining_balance: lease.remaining_balance
                };
                
                console.log('leaseData:', leaseData);
                // lease.disabledInput = true;
                
                this.backendService.updateLease(lease.lease_agreement_id, leaseData).subscribe({
                  next: (response) => {
                    console.log('Lease Agreement updated successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Rent Updated', detail: 'Remaining balance updated successfully.' });
                    lease.updatedMonthlyRent = null;
                  },
                  error: (error) => {
                    console.error('Error updating Lease Agreement:', error);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update Remaining Balance.' });
                  }
                });
              } else {
                console.error('User data is incomplete. Missing necessary information.');
              }
            },
            error: (error: any) => {
              console.error('Error fetching user data:', error);
            }
          });
        } else {
          console.error('Email not found in session storage.');
        }
      }
    }
  }

  getFormattedDate(date: string): string {
    const startDateWithoutTime = new Date(date);
    startDateWithoutTime.setHours(0, 0, 0, 0); // Set time to midnight
    return startDateWithoutTime.toISOString().slice(0, 10); // Return formatted date string
  }

  computeDates(lease: any): void {
    if (lease.numberOfMonths && lease.start_date) {
      const startDate = new Date(lease.start_date);
      const numberOfMonths = lease.numberOfMonths;
  
      const endDate = new Date(startDate.setMonth(startDate.getMonth() + numberOfMonths));
      const formattedEndDate = `${endDate.getFullYear()}/${endDate.getMonth() + 1}/${endDate.getDate()}`;

      this.computedEndDates[lease.lease_agreement_id] = formattedEndDate;
      lease.end_date = formattedEndDate;
      localStorage.setItem(`endDate_${lease.lease_agreement_id}`, formattedEndDate); // Save end date to local storage
    }
  }
  
  
  onStartDateChange(lease: any): void {
    this.computeDates(lease);
    localStorage.setItem(`startDate_${lease.lease_agreement_id}`, lease.start_date); // Save start date to local storage
  }


  updateLeaseDates(lease: any): void {
    if (lease.start_date && lease.end_date) {
      const startDate = new Date(lease.start_date);
      const endDate = new Date(lease.end_date);
  
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid start date or end date');
        return;
      }
      const formattedStartDate = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getDate().toString().padStart(2, '0')}`;
      const formattedEndDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;
      
      
      const data = {
        ...lease,
        start_date: formattedStartDate,
        end_date: formattedEndDate
      };
  
      this.backendService.updateLease(lease.lease_agreement_id, data).subscribe({
        next: (response) => {
          console.log('Lease dates updated successfully:', response);
          this.messageService.add({ severity: 'success', summary: 'Lease Dates Updated', detail: 'Start and end dates updated successfully.' });
          lease.startDateSaved = true; // Set the startDateSaved flag to true
          localStorage.setItem('leases', JSON.stringify(this.leases));
        },
        error: (error) => {
          console.error('Error updating lease dates:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update lease dates.' });
        }
      });
    } else {
      console.error('Start date or end date is missing.');
    }
  }
}