<?php

use App\Http\Controllers\CutListController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\MaterialController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ToolController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Public routes
Route::get('/portfolio', [PortfolioController::class, 'index'])->name('portfolio.index');

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Projects (resource: index, create, store, show, edit, update, destroy)
    Route::resource('projects', ProjectController::class);

    // Project sub-resources
    Route::post('/projects/{project}/photos', [ProjectController::class, 'uploadPhoto'])->name('projects.upload-photo');
    Route::post('/projects/{project}/time', [ProjectController::class, 'logTime'])->name('projects.log-time');
    Route::put('/projects/{project}/time/{entry}/stop', [ProjectController::class, 'stopTimer'])->name('projects.stop-timer');
    Route::post('/projects/{project}/materials', [ProjectController::class, 'attachMaterial'])->name('projects.attach-material');
    Route::post('/projects/{project}/notes', [ProjectController::class, 'addNote'])->name('projects.add-note');

    // Materials (resource: index, create, store, show, edit, update — no destroy)
    Route::resource('materials', MaterialController::class)->except(['destroy']);

    // Material sub-resources
    Route::post('/materials/{material}/adjust', [MaterialController::class, 'adjustStock'])->name('materials.adjust-stock');

    // Tools (resource: index, create, store, show, edit, update — no destroy)
    Route::resource('tools', ToolController::class)->except(['destroy']);

    // Tool sub-resources
    Route::post('/tools/{tool}/maintenance', [ToolController::class, 'logMaintenance'])->name('tools.log-maintenance');

    // Finance
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('/finance/expenses', [FinanceController::class, 'storeExpense'])->name('finance.store-expense');
    Route::post('/finance/revenues', [FinanceController::class, 'storeRevenue'])->name('finance.store-revenue');

    // Cut List
    Route::get('/cut-list', [CutListController::class, 'index'])->name('cut-list.index');
    Route::post('/cut-list/optimize', [CutListController::class, 'optimize'])->name('cut-list.optimize');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
