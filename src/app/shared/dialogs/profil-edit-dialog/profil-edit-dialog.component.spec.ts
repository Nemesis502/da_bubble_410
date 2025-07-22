import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilEditDialogComponent } from './profil-edit-dialog.component';

describe('ProfilEditDialogComponent', () => {
  let component: ProfilEditDialogComponent;
  let fixture: ComponentFixture<ProfilEditDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilEditDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProfilEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
