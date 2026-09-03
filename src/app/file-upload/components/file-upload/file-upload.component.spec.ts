import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiButton } from '@taiga-ui/core';
import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TuiButton, TuiBadge],
      declarations: [FileUploadComponent],
    });
    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the file picker from the keyboard drop-zone path', () => {
    const openFileDialog = spyOn(component, 'openFileDialog');
    let prevented = false;
    const event = {
      key: 'Enter',
      target: undefined,
      currentTarget: undefined,
      preventDefault: () => { prevented = true; },
    } as any;
    event.target = event.currentTarget = event;

    component.onDropZoneKeydown(event);

    expect(prevented).toBeTrue();
    expect(openFileDialog).toHaveBeenCalled();
  });

  it('exposes a named upload group and keyboard-accessible actions', () => {
    const surface = fixture.nativeElement.querySelector('.upload-surface') as HTMLElement;
    expect(surface.getAttribute('role')).toBe('group');
    expect(surface.getAttribute('tabindex')).toBe('0');
    expect(surface.getAttribute('aria-labelledby')).toBe('upload-surface-title');
    expect(fixture.nativeElement.querySelector('button[aria-label="Choose an Artillery JSON report"]')).not.toBeNull();
  });

  it('forwards only the first dropped file', () => {
    const first = new File(['{}'], 'first.json', {type: 'application/json'});
    const second = new File(['{}'], 'second.json', {type: 'application/json'});
    const processSelectedFile = spyOn<any>(component, 'processSelectedFile');
    const event = {
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
      dataTransfer: {files: [first, second]},
    } as unknown as DragEvent;

    component.onFileDropped(event);

    expect(processSelectedFile).toHaveBeenCalledOnceWith(first);
  });

  it('ignores upload activation while processing', () => {
    component.isProcessing = true;
    const processSelectedFile = spyOn<any>(component, 'processSelectedFile');
    const file = new File(['{}'], 'report.json');
    const selectedEvent = {target: {files: [file]}} as unknown as Event;
    const droppedEvent = {
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
      dataTransfer: {files: [file]},
    } as unknown as DragEvent;

    component.onFileSelected(selectedEvent);
    component.onFileDropped(droppedEvent);

    expect(processSelectedFile).not.toHaveBeenCalled();
  });

  it('projects validation outcomes into explicit upload states', async () => {
    const states: string[] = [];
    component.onStateChange.subscribe((state) => states.push(state.kind));
    component.onFileSelected({target: {files: [new File(['{}'], 'report.txt')]}} as unknown as Event);
    expect(component.uploadState.kind).toBe('invalid-extension');

    component.fileName = 'report.json';
    component.isProcessing = true;
    await component.processTheJson(new File(['not json'], 'report.json'));
    expect(component.uploadState.kind).toBe('invalid-json');

    component.fileName = 'report.json';
    component.isProcessing = true;
    await component.processTheJson(new File(['[]'], 'report.json'));
    expect(component.uploadState.kind).toBe('unsupported-shape');
    expect(states).toContain('reading');
    expect(states).toContain('invalid-extension');
    expect(states).toContain('invalid-json');
    expect(states).toContain('unsupported-shape');
  });
});
